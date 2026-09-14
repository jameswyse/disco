import { expect, test } from "./authenticatedTest";
import { seerrFixtureOrigin } from "./browserTestEnvironment";

for (const width of [390, 1440]) {
  test(`search suggests titles and people and Enter opens all results at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/movies");
    const search = page.getByRole("combobox", { name: "Search", exact: true });
    await search.fill("Law & Order + café");
    const suggestions = page.getByRole("dialog", { name: "Search suggestions" });
    await expect(suggestions.getByText("Fixture Person")).toBeVisible();
    await expect(suggestions.getByText("Fixture Series One")).toBeVisible();
    await expect(suggestions.getByText("Fixture Film Two")).toBeVisible();
    await expect(page).toHaveURL(/\/movies$/);
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=Law/);
    await expect(suggestions).toBeHidden();
    const results = page.getByRole("list", { name: "Search results" });
    await expect(results.getByRole("listitem")).toHaveCount(3);
    await results.getByRole("link", { name: /Fixture Person/ }).click();
    await expect(page).toHaveURL(/\/person\/301$/);
    await expect(page.getByRole("heading", { level: 1, name: "Fixture Person" })).toBeVisible();
    await expect(page.getByText("A performer and filmmaker", { exact: false })).toBeVisible();
    await expect(page.getByRole("list", { name: "Filmography" }).getByRole("listitem")).toHaveCount(
      3,
    );
    await expect(page.getByText("Brisbane")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: testInfo.outputPath("person.png"), fullPage: true });
  });
}

test("search appends pages without duplicate results", async ({ page }) => {
  await page.goto("/search?q=endless");
  const results = page.getByRole("list", { name: "Search results" });
  await expect(results.getByText("Fixture Film One")).toBeVisible();
  await page.getByRole("main").locator("footer").scrollIntoViewIfNeeded();
  await expect(results.getByRole("listitem")).toHaveCount(4);
  await expect(results.getByText("Fixture Person")).toHaveCount(1);
  await expect(page.getByText("You’re all caught up")).toBeVisible();
});

test("empty and failed searches have distinct recovery states", async ({ page }) => {
  await page.goto("/search?q=no%20matches");
  await expect(page.getByRole("heading", { name: "No results found" })).toBeVisible();
  await page.goto("/search?q=search%20failure");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Search couldn’t be loaded",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("quality profile is sent with a season request and appears on existing requests", async ({
  page,
  request,
}) => {
  await page.goto("/title/tv/201");
  await expect(page.getByText(/Quality profile · HD-1080p/)).toBeVisible();
  const season = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: /^Season 2/ }) });
  await season.getByRole("button", { name: "Request", exact: true }).click();
  await page.getByLabel("Quality profile", { exact: true }).selectOption("0:2");
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(season.getByText("✓ Requested")).toBeVisible();
  const recorded: unknown = await (
    await request.get(`${seerrFixtureOrigin}/__fixture/requests`)
  ).json();
  expect(recorded).toMatchObject({
    requests: expect.arrayContaining([
      {
        mediaType: "tv",
        mediaId: 201,
        seasons: [2],
        profileId: 2,
        serverId: 0,
        is4k: false,
        userId: 2,
      },
    ]),
  });
  await page.goto("/requests");
  await expect(page.getByRole("list", { name: "Requests" }).getByText(/HD-1080p/)).toBeVisible();
});

test("a request dialog opened from a hover card stays open", async ({ page }) => {
  await page.goto("/movies?list=popular");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: /Fixture Film Two/ }) });
  await card.getByRole("button", { name: /info/i }).click();
  await card.getByRole("button", { name: /Request/ }).click();
  const dialog = page.getByRole("dialog", { name: "Request title", exact: true });
  await expect(dialog).toBeVisible();
  await page.mouse.move(5, 5);
  await dialog.getByLabel("Quality profile").selectOption("0:2");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("a later page failure preserves results and offers a retry", async ({ page }) => {
  await page.goto("/search?q=endless%20failure");
  const results = page.getByRole("list", { name: "Search results" });
  const footer = page.getByRole("main").locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByRole("alert")).toBeVisible();
  await expect(results.getByRole("listitem")).toHaveCount(2);
  await footer.getByRole("button", { name: "Try again" }).click();
  await expect(footer.getByRole("alert")).toBeVisible();
  await expect(results.getByRole("listitem")).toHaveCount(2);
});

test("request revalidation replaces stale result cards", async ({ page }) => {
  await page.goto("/search?q=refresh%20request");
  const results = page.getByRole("list", { name: "Search results" });
  await results.getByRole("button", { name: "Quick info for Refresh Film" }).click();
  await page.getByRole("button", { name: /Request/, exact: false }).click();
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(results.getByRole("img", { name: "Requested", exact: true })).toBeVisible();
  await results.getByRole("button", { name: "Quick info for Refresh Film" }).click();
  await expect(page.getByRole("dialog").getByText("Requested", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: /Request/ })).toHaveCount(0);
});

test("extra filters are counted and mixed views require a media type before sorting", async ({
  page,
}) => {
  await page.goto("/netflix?list=popular&lang=any");
  await page.getByText(/^Filters 0$/).click();
  await expect(page.getByLabel("Sort order", { exact: true })).toBeDisabled();
  await page
    .getByRole("navigation", { name: "Media type" })
    .getByRole("link", { name: "Movies" })
    .click();
  await expect(page.getByLabel("Sort order", { exact: true })).toBeEnabled();
  await page.getByLabel("Sort order", { exact: true }).selectOption("rating");
  await expect(page).toHaveURL(/sort=rating/);
  const year = page.getByLabel("Release year", { exact: true });
  await year.fill("2020");
  await year.press("Enter");
  await expect(page).toHaveURL(/year=2020/);
  await page.getByLabel("Minimum votes", { exact: true }).selectOption("500");
  await expect(page).toHaveURL(/votes=500/);
  await expect(page.getByText(/^Filters 4$/)).toBeVisible();
});

test("a rejected quick-info request keeps its dialog and error visible", async ({ page }) => {
  await page.goto("/search?q=rejected%20request");
  await page.getByRole("button", { name: "Quick info for Rejected Film" }).click();
  await page.getByRole("button", { name: /Request/ }).click();
  const dialog = page.getByRole("dialog", { name: "Request title", exact: true });
  await dialog.getByRole("button", { name: "Confirm request" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirm request" })).toBeEnabled();
  await expect(page).toHaveURL(/\/search\?q=rejected%20request$/);
});
