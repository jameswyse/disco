import { expect, test } from "./authenticatedTest";

for (const width of [390, 1440]) {
  test(`blurring the release year keeps filters usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const value of ["", "2020"]) {
      const path = value ? `/movies?year=${value}` : "/movies";
      await page.goto(path);
      await page.getByText(/^Filters \d+$/).click();
      const panel = page.getByRole("group", { name: "Filters", exact: true });
      const year = page.getByLabel("Release year", { exact: true });

      await year.click();
      // Clicking panel padding must blur the field without dismissing the filters.
      await panel.click({ position: { x: 8, y: 8 } });
      await expect(year).not.toBeFocused();
      await expect(panel).toBeVisible();
      await expect(year).toHaveValue(value);
      expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);

      await year.click();
      await year.press("Tab");
      await expect(page.getByLabel("Minimum votes", { exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(page.getByText(/^Filters \d+$/)).toBeFocused();
    }

    await page.getByText(/^Filters \d+$/).click();
    const panel = page.getByRole("group", { name: "Filters", exact: true });
    const year = page.getByLabel("Release year", { exact: true });
    await year.fill("2021");
    await panel.click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/year=2021$/);
    await expect(panel).toBeVisible();
    await expect(year).toHaveValue("2021");

    await year.fill("");
    await panel.click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/movies$/);
    await expect(panel).toBeVisible();
    await page.getByLabel("Hide already available", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Hide already requested", { exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(panel).toBeHidden();

    await page.getByText(/^Filters \d+$/).click();
    await year.click();
    await page.getByRole("combobox", { name: "Search", exact: true }).click();
    await expect(panel).toBeHidden();
  });
}

test("the media type filter narrows mixed views and is kept in the URL", async ({ page }) => {
  await page.goto("/netflix?list=popular&hideRequested=0");
  await page.getByText(/^Filters \d+$/).click();
  await page
    .getByRole("navigation", { name: "Media type" })
    .getByRole("link", { name: "TV" })
    .click();

  await expect(page).toHaveURL(/\/netflix\?list=popular&type=tv&hideRequested=0$/);
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

test("availability and request filters default on and can be toggled independently", async ({
  page,
}) => {
  await page.goto("/netflix?list=popular&lang=any");
  const grid = page.getByRole("list", { name: "Popular titles" });
  await expect(grid.getByRole("link", { name: /Fixture Film Two/ })).toBeVisible();
  await expect(grid.getByText("Fixture Film One")).toHaveCount(0);
  await expect(grid.getByText("Fixture Series One")).toHaveCount(0);
  await expect(page.getByText(/1 hidden because they're already available/)).toBeVisible();
  await expect(page.getByText(/1 hidden because they're already requested/)).toBeVisible();
  await page.getByText(/^Filters 2$/).click();
  const available = page.getByLabel("Hide already available", { exact: true });
  const requested = page.getByLabel("Hide already requested", { exact: true });
  await expect(available).toBeChecked();
  await expect(requested).toBeChecked();
  await requested.click();
  await expect(page).toHaveURL(/hideRequested=0/);
  await expect(requested).not.toBeChecked();
  await expect(grid.getByText("Fixture Series One")).toBeVisible();
  await expect(grid.getByText("Fixture Film One")).toHaveCount(0);
  await available.click();
  await expect(page).toHaveURL(/hide=0&hideRequested=0/);
  await expect(available).not.toBeChecked();
  await expect(grid.getByText("Fixture Film One")).toBeVisible();
  await requested.click();
  await expect(page).not.toHaveURL(/hideRequested=/);
  await expect(requested).toBeChecked();
  await expect(grid.getByText("Fixture Series One")).toHaveCount(0);
  await expect(grid.getByText("Fixture Film One")).toBeVisible();
  await page.reload();
  await page.getByText(/^Filters 1$/).click();
  await expect(available).not.toBeChecked();
  await expect(requested).toBeChecked();
});

test("an empty requested list can reveal its hidden titles", async ({ page }) => {
  await page.goto("/tv?list=popular&lang=any");
  await expect(
    page.getByRole("heading", { name: "These titles are already requested" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Show hidden titles", exact: true }).click();
  await expect(page).toHaveURL(/hideRequested=0/);
  await expect(
    page.getByRole("list", { name: "Popular titles" }).getByText("Fixture Series One"),
  ).toBeVisible();
});

test("provider upcoming lists identify originals without explanatory text", async ({ page }) => {
  await page.goto("/netflix?list=upcoming&lang=any&hideRequested=0");
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
    const filters = page.getByText(/^Filters 3$/);
    const menu = page.getByRole("group", { name: "Filters", exact: true });
    await expect(search).toBeVisible();
    await expect(menu).toBeHidden();
    await filters.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await expect(page).toHaveURL(/genre=18&lang=en/);
    await expect(page.getByText(/^Filters 4$/)).toBeVisible();
    await page.getByLabel("Hide already available", { exact: true }).click();
    await expect(page).toHaveURL(/hide=0/);
    await expect(page.getByLabel("Hide already available", { exact: true })).not.toBeChecked();
    await expect(page.getByText(/^Filters 3$/)).toBeVisible();
    await page.getByLabel("Hide already available", { exact: true }).click();
    await expect(page).not.toHaveURL(/hide=0/);
    await expect(page.getByLabel("Hide already available", { exact: true })).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByText(/^Filters 4$/)).toBeFocused();

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
    await page.getByText(/^Filters 4$/).click();
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

test("extra filters are counted and mixed views require a media type before sorting", async ({
  page,
}) => {
  await page.goto("/netflix?list=popular&lang=any");
  await page.getByText(/^Filters 2$/).click();
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
  await expect(page.getByText(/^Filters 6$/)).toBeVisible();
});
