import { expect, test } from "@playwright/test";

import { seerrFixtureOrigin } from "./browserTestEnvironment";

import type { APIRequestContext } from "@playwright/test";

/** Assert against the mutations the fixture Seerr has recorded so far. */
async function expectRecorded(
  request: APIRequestContext,
  expected: Readonly<{ requests?: unknown; watchlist?: unknown }>,
): Promise<void> {
  const response = await request.get(`${seerrFixtureOrigin}/__fixture/requests`);
  const body: unknown = await response.json();

  expect(body).toMatchObject(expected);
}

test("a title card opens the details screen", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByRole("link", { name: /Fixture Film Two/ }).click();

  await expect(page).toHaveURL(/\/title\/movie\/102$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fixture Film Two");
  await expect(page.getByText("Not yet requested.")).toBeVisible();
  await expect(page.getByText("91%")).toBeVisible();
  await expect(page.getByText("Fixture Actor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "More like this" })).toBeVisible();
});

test("requesting a film posts to Seerr and shows the requested state", async ({
  page,
  request,
}) => {
  await page.goto("/title/movie/102");
  await page.getByRole("button", { name: "↓ Request" }).click();

  await expect(page.getByText("✓ Requested")).toBeVisible();
  await expectRecorded(request, {
    requests: expect.arrayContaining([{ mediaType: "movie", mediaId: 102 }]),
  });
});

test("series show seasons with their status and per-season requests", async ({ page, request }) => {
  await page.goto("/title/tv/201");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fixture Series One");
  await expect(page.getByText("Limited series")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Request status/ })).toBeVisible();
  await expect(page.getByRole("list").getByText("Searching", { exact: true })).toBeVisible();

  const seasonTwo = page.getByRole("listitem").filter({ hasText: "Season 2" });
  await seasonTwo.getByRole("button", { name: "Request" }).click();

  await expect(seasonTwo.getByText("✓ Requested")).toBeVisible();
  await expectRecorded(request, {
    requests: expect.arrayContaining([{ mediaType: "tv", mediaId: 201, seasons: [2] }]),
  });
});

test("the watchlist button toggles through Seerr", async ({ page, request }) => {
  await page.goto("/title/movie/102");
  await page.getByRole("button", { name: "Add to watchlist" }).click();

  await expect(page.getByRole("button", { name: "Remove from watchlist" })).toBeVisible();
  await expectRecorded(request, {
    watchlist: expect.arrayContaining([
      { tmdbId: 102, mediaType: "movie", title: "Fixture Film Two" },
    ]),
  });
});

test("hovering a card opens a preview with details", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByRole("link", { name: /Fixture Film Two/ }).hover();

  const preview = page.getByRole("dialog");
  await expect(preview).toBeVisible();
  await expect(preview.getByText("A second film that nobody has requested yet.")).toBeVisible();
  await expect(preview.getByText("Fixture Actor")).toBeVisible();
  await expect(preview.getByRole("link", { name: "Details" })).toHaveAttribute(
    "href",
    "/title/movie/102",
  );
});

test("the requests page lists Seerr requests", async ({ page }) => {
  await page.goto("/requests");

  const list = page.getByRole("list", { name: "Requests" });
  await expect(list.getByText("Fixture Series One")).toBeVisible();
  await expect(list.getByText("Approved")).toBeVisible();
  await expect(list.getByText("Processing")).toBeVisible();
});
