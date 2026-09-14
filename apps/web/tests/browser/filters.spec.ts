import { expect, test } from "./authenticatedTest";

test("the media type filter narrows mixed views and is kept in the URL", async ({ page }) => {
  await page.goto("/netflix?list=popular");
  await page.getByText(/^Filters \d+$/).click();
  await page
    .getByRole("navigation", { name: "Media type" })
    .getByRole("link", { name: "TV" })
    .click();

  await expect(page).toHaveURL(/\/netflix\?list=popular&type=tv$/);
  const grid = page.getByRole("list", { name: "Popular titles" });
  await expect(grid.getByText("Fixture Series One")).toBeVisible();
  await expect(grid.getByText("Fixture Film One")).toHaveCount(0);
});

test("genre, language and rating filters navigate with query parameters", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByText(/^Filters \d+$/).click();
  await page.getByLabel("Genre").selectOption("35");
  await expect(page).toHaveURL(/genre=35/);
  await page.getByLabel("Rating").selectOption("7");
  await expect(page).toHaveURL(/genre=35&rating=7/);
  await expect(page.getByLabel("Genre")).toHaveValue("35");
  await expect(page.getByLabel("Rating")).toHaveValue("7");
});

test("hiding library titles removes them and reports the count", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByText(/^Filters \d+$/).click();
  await page.getByLabel("Hide already available").click();

  await expect(page).toHaveURL(/hide=1/);
  await expect(page.getByText(/1 hidden because they're already available/)).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Popular titles" }).getByText("Fixture Film One"),
  ).toHaveCount(0);
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

test("provider upcoming lists identify originals without explanatory text", async ({ page }) => {
  await page.goto("/netflix?list=upcoming&lang=any");
  await expect(page.getByRole("link", { name: "Upcoming originals", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByText(/Series dates are first premieres, not returning seasons/),
  ).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Upcoming originals titles" })).toBeVisible();
});

test("an empty upcoming list offers another list without a zero-page summary", async ({ page }) => {
  await page.goto("/movies?list=upcoming&lang=any");
  await expect(page.getByRole("heading", { name: "No upcoming titles listed" })).toBeVisible();
  await expect(page.getByText(/page 1 of/)).toHaveCount(0);
  await page.getByRole("link", { name: "Browse Popular", exact: true }).click();
  await expect(page.getByRole("list", { name: "Popular titles" })).toBeVisible();
});

test("empty filtered results can clear filters on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/movies?list=popular&genre=999&lang=any");
  await expect(page.getByRole("heading", { name: "No titles match your filters" })).toBeVisible();
  const empty = page.getByRole("region", { name: "No titles match your filters" });
  const dimensions = await empty.evaluate((element) => {
    const style = getComputedStyle(element);
    const icon = element.querySelector("svg")?.getBoundingClientRect();

    return {
      width: element.getBoundingClientRect().width,
      padding: Number.parseFloat(style.paddingTop),
      gap: Number.parseFloat(style.gap),
      iconWidth: icon?.width,
      iconHeight: icon?.height,
    };
  });
  expect(dimensions.width).toBeLessThanOrEqual(358);
  expect(dimensions.padding).toBeGreaterThanOrEqual(24);
  expect(dimensions.gap).toBeGreaterThanOrEqual(12);
  expect(dimensions.iconWidth).toBe(32);
  expect(dimensions.iconHeight).toBe(32);
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("list", { name: "Popular titles" })).toBeVisible();
  await expect(page).not.toHaveURL(/genre=/);
});

for (const width of [390, 1440]) {
  test(`navbar search, filters and results footer fit at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/movies?list=popular&genre=18&lang=any");
    const search = page.getByRole("banner").getByRole("combobox", { name: "Search", exact: true });
    const filters = page.getByText(/^Filters 1$/);
    const menu = page.getByRole("group", { name: "Filters", exact: true });
    await expect(search).toBeVisible();
    await expect(menu).toBeHidden();
    await filters.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await expect(page).toHaveURL(/genre=18&lang=en/);
    await expect(page.getByText(/^Filters 2$/)).toBeVisible();
    await page.getByLabel("Hide already available", { exact: true }).click();
    await expect(page).toHaveURL(/hide=1/);
    await expect(page.getByLabel("Hide already available", { exact: true })).toBeChecked();
    await expect(page.getByText(/^Filters 3$/)).toBeVisible();
    await page.getByLabel("Hide already available", { exact: true }).click();
    await expect(page).not.toHaveURL(/hide=1/);
    await expect(page.getByLabel("Hide already available", { exact: true })).not.toBeChecked();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByText(/^Filters 2$/)).toBeFocused();

    const footer = page.getByRole("main").locator("footer");
    const summary = footer.getByText(/Popular on Movies · 101 titles · page \d of 3/);
    await expect(summary).toBeVisible();
    const gridBounds = await page.getByRole("list", { name: "Popular titles" }).boundingBox();
    const summaryBounds = await summary.boundingBox();
    const nextBounds = await footer.locator("div").first().boundingBox();
    const searchBounds = await search.boundingBox();

    if (!gridBounds || !summaryBounds || !nextBounds || !searchBounds) {
      throw new Error("Browse layout elements are not visible");
    }

    expect(summaryBounds.y).toBeGreaterThanOrEqual(gridBounds.y + gridBounds.height);
    expect(nextBounds.x + nextBounds.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );

    if (width === 1440) {
      expect(Math.abs(searchBounds.x + searchBounds.width / 2 - width / 2)).toBeLessThan(2);
      expect(nextBounds.x).toBeGreaterThan(summaryBounds.x + summaryBounds.width);
    }

    await page.screenshot({ path: testInfo.outputPath("browse-layout.png"), fullPage: true });
    await page.getByText(/^Filters 2$/).click();
    await search.click();
    await expect(menu).toBeHidden();
    await search.fill("fixture");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=fixture$/);
    await expect(search).toHaveValue("fixture");
    await page.goBack();
    await expect(search).toHaveValue("");
  });
}
