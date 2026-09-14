import { expect, test } from "./authenticatedTest";

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

test("search finds titles through Seerr", async ({ page }) => {
  await page.goto("/movies");
  await page.getByRole("combobox", { name: "Search" }).fill("fixture");
  await page.getByRole("combobox", { name: "Search" }).press("Enter");

  await expect(page).toHaveURL(/\/search\?q=fixture$/);
  await expect(page.getByRole("combobox", { name: "Search", exact: true })).toHaveCount(1);
  await expect(page.getByRole("banner").getByRole("combobox")).toHaveValue("fixture");
  await expect(page.getByText(/3 results for “fixture”/)).toBeVisible();
  const grid = page.getByRole("list", { name: "Search results" });
  await expect(grid.getByText("Fixture Series One")).toBeVisible();
  await expect(grid.getByRole("link", { name: /Fixture Film Two/ })).toBeVisible();
});
