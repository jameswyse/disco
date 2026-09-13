import { expect, test } from "@playwright/test";

import { signIn } from "./authenticatedTest";
import { seerrFixtureOrigin } from "./browserTestEnvironment";

import type { APIRequestContext } from "@playwright/test";

async function recordedActions(request: APIRequestContext) {
  const response = await request.get(`${seerrFixtureOrigin}/__fixture/requests`);
  const body: unknown = await response.json();

  return body;
}

test("anonymous visitors must sign in and cannot fetch protected title data", async ({
  page,
  request,
}) => {
  await page.goto("/movies");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Plex" })).toBeVisible();

  const response = await request.get("/api/titles/movie/102", { headers: { "X-API-User": "2" } });
  expect(response.status()).toBe(401);
});

test("local sign-in rejects wrong credentials then establishes the Seerr user's session", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("fixture@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Sign-in failed/ })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page);
  await expect(page.getByText("Fixture User", { exact: true })).toBeVisible();
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "disco_session",
  );
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  expect((await page.request.get("/api/titles/movie/102")).status()).toBe(200);
});

test("signing out invalidates the Seerr session even if its old cookie is replayed", async ({
  page,
}) => {
  await signIn(page);
  const cookies = await page.context().cookies();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "disco_session")).toBe(
    false,
  );

  await page.context().addCookies(cookies);
  expect((await page.request.get("/api/titles/movie/102")).status()).toBe(401);
  await page.goto("/movies");
  await expect(page).toHaveURL(/\/login$/);
});

test("a rejected logout keeps the session and shows the error", async ({ page }) => {
  await signIn(page);
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "disco_session",
  );

  if (session === undefined) {
    throw new Error("Sign-in did not set its session cookie");
  }

  await page.request.post(`${seerrFixtureOrigin}/__fixture/reject-logout`, {
    headers: { Cookie: `connect.sid=${session.value}` },
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /could not sign you out/ })).toBeVisible();
  await expect(page).toHaveURL(/\/movies$/);
  expect(
    (await page.context().cookies()).find((cookie) => cookie.name === "disco_session"),
  ).toEqual(session);
  expect((await page.request.get("/api/titles/movie/102")).status()).toBe(200);
});

test("a session expired by Seerr cannot use the global API key to regain access", async ({
  page,
}) => {
  await signIn(page);
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "disco_session",
  );
  expect(session).toBeDefined();

  if (session === undefined) {
    throw new Error("Sign-in did not set its session cookie");
  }

  await page.request.post(`${seerrFixtureOrigin}/__fixture/expire`, {
    headers: { Cookie: `connect.sid=${session.value}` },
  });
  expect((await page.request.get("/api/titles/movie/102")).status()).toBe(401);
  await page.goto("/movies");
  await expect(page).toHaveURL(/\/login$/);
});

test("a forged session and user header cannot impersonate a Seerr account", async ({
  page,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error("Browser base URL is not configured");
  }

  await page
    .context()
    .addCookies([{ name: "disco_session", value: "s:forged.signature", url: baseURL }]);
  const response = await page.request.get("/api/titles/movie/102", {
    headers: { "X-API-User": "2" },
  });
  expect(response.status()).toBe(401);
  await page.goto("/movies");
  await expect(page).toHaveURL(/\/login$/);
});

test("concurrent users request titles and update their watchlists under their own identities", async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  if (baseURL === undefined) {
    throw new Error("Browser base URL is not configured");
  }

  const secondContext = await browser.newContext({ baseURL });

  try {
    const secondPage = await secondContext.newPage();
    await Promise.all([signIn(page), signIn(secondPage, "second@example.test")]);
    await expect(secondPage.getByText("Second User", { exact: true })).toBeVisible();
    await Promise.all([page.goto("/title/movie/102"), secondPage.goto("/title/movie/102")]);
    await Promise.all([
      page.getByRole("button", { name: "↓ Request" }).click(),
      secondPage.getByRole("button", { name: "↓ Request" }).click(),
    ]);
    await expect(page.getByText("✓ Requested")).toBeVisible();
    await expect(secondPage.getByText("✓ Requested")).toBeVisible();
    await Promise.all([
      page.getByRole("button", { name: "Add to watchlist" }).click(),
      secondPage.getByRole("button", { name: "Add to watchlist" }).click(),
    ]);
    await expect(page.getByRole("button", { name: "Remove from watchlist" })).toBeVisible();
    await expect(secondPage.getByRole("button", { name: "Remove from watchlist" })).toBeVisible();
    expect(await recordedActions(request)).toMatchObject({
      requests: expect.arrayContaining([
        { mediaType: "movie", mediaId: 102, userId: 2 },
        { mediaType: "movie", mediaId: 102, userId: 3 },
      ]),
      watchlist: expect.arrayContaining([
        { tmdbId: 102, mediaType: "movie", title: "Fixture Film Two", userId: 2 },
        { tmdbId: 102, mediaType: "movie", title: "Fixture Film Two", userId: 3 },
      ]),
    });
  } finally {
    await secondContext.close();
  }
});

test("Plex authorisation works without secure-context UUID support", async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, "randomUUID", { value: undefined });
  });
  await context.route("https://plex.tv/api/v2/pins**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      json:
        route.request().method() === "POST"
          ? { id: 123, code: "fixture-pin", expiresAt: "2031-01-01T00:00:00.000Z" }
          : { authToken: "fixture-plex-token" },
    });
  });
  await context.route("https://app.plex.tv/auth/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Plex authorisation fixture" }),
  );
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in with Plex" }).click();
  await expect(page).toHaveURL(/\/movies$/);
  await expect(page.getByText("Fixture User", { exact: true })).toBeVisible();
  expect((await page.request.get("/api/titles/movie/102")).status()).toBe(200);
});
