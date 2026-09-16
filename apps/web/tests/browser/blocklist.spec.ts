import { expect, signIn, test } from "./authenticatedTest";
import { seerrFixtureOrigin } from "./browserTestEnvironment";

test("blocklist a browse result, find it in search, and restore it from details", async ({
  page,
  request,
}) => {
  await page.goto("/movies?list=popular&lang=fr");
  await page.getByRole("button", { name: "Quick info for Blocklist Film" }).click();
  const preview = page.getByRole("dialog", { name: "Blocklist Film quick info" });
  await preview.getByRole("button", { name: "Blocklist", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Blocklist Blocklist Film?", exact: true });
  await expect(confirmation).toContainText("everyone in Seerr");
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(preview.getByRole("button", { name: "Blocklist", exact: true })).toBeFocused();
  await preview.getByRole("button", { name: "Blocklist", exact: true }).press("Enter");
  await confirmation.getByRole("button", { name: "Blocklist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Quick info for Blocklist Film" })).toHaveCount(0);

  await page.goto("/search?q=blocklist");
  await page.getByRole("button", { name: "Quick info for Blocklist Film" }).click();
  await expect(preview.getByRole("button", { name: "Remove from blocklist" })).toBeVisible();
  await expect(preview.getByRole("button", { name: /Request/ })).toHaveCount(0);
  await preview.getByRole("link", { name: "Details", exact: true }).click();
  await expect(page).toHaveURL("/title/movie/30101");
  await expect(page.getByRole("button", { name: /Request/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove from blocklist" }).click();
  await page
    .getByRole("dialog", { name: "Unblock Blocklist Film?" })
    .getByRole("button", { name: "Remove from blocklist" })
    .click();
  await expect(page.getByRole("button", { name: "↓ Request", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Blocklist", exact: true })).toBeVisible();
  await page.goto("/movies?list=popular&lang=fr");
  await expect(page.getByRole("button", { name: "Quick info for Blocklist Film" })).toBeVisible();

  const response = await request.get(`${seerrFixtureOrigin}/__fixture/requests`);
  expect(await response.json()).toMatchObject({
    blocklist: expect.arrayContaining([
      { tmdbId: 30101, mediaType: "movie", title: "Blocklist Film", user: 2, userId: 2 },
      { removed: 30101, mediaType: "movie", userId: 2 },
    ]),
  });
});

test("blocklist and restore a series from its details on mobile", async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto("/title/tv/30101");
  await page.getByRole("button", { name: "Blocklist", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Blocklist Blocklist Series?" })
    .getByRole("button", { name: "Blocklist", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Remove from blocklist" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Request/ })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Remove from blocklist" }).click();
  await page
    .getByRole("dialog", { name: "Unblock Blocklist Series?" })
    .getByRole("button", { name: "Remove from blocklist" })
    .click();
  await expect(page.getByRole("button", { name: "↓ Request all seasons" })).toBeVisible();

  const response = await request.get(`${seerrFixtureOrigin}/__fixture/requests`);
  expect(await response.json()).toMatchObject({
    blocklist: expect.arrayContaining([
      { tmdbId: 30101, mediaType: "tv", title: "Blocklist Series", user: 2, userId: 2 },
      { removed: 30101, mediaType: "tv", userId: 2 },
    ]),
  });
});

test("Seerr rejection leaves the title unblocked and shows the error", async ({ page }) => {
  await page.goto("/title/movie/30102");
  await page.getByRole("button", { name: "Blocklist", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Blocklist Blocklist Film?" });
  await dialog.getByRole("button", { name: "Blocklist", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Blocklist", exact: true })).toBeVisible();
});

test("revoked blocklist permission rejects a previously opened action", async ({
  page,
  context,
}) => {
  await page.goto("/title/movie/30102");
  await page.getByRole("button", { name: "Blocklist", exact: true }).click();
  await context.clearCookies();
  const otherTab = await context.newPage();
  await signIn(otherTab, "second@example.test");
  await otherTab.close();
  const dialog = page.getByRole("dialog", { name: "Blocklist Blocklist Film?" });
  await dialog.getByRole("button", { name: "Blocklist", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("permission");
  await page.reload();
  await expect(page.getByRole("button", { name: "Blocklist", exact: true })).toHaveCount(0);
  await page.goto("/movies?list=popular");
  await page.getByRole("button", { name: "Quick info for Fixture Film Two" }).click();
  const preview = page.getByRole("dialog", { name: "Fixture Film Two quick info" });
  await expect(preview.getByRole("button", { name: "Add to watchlist" })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Blocklist", exact: true })).toHaveCount(0);
});
