import { expect, test } from "./authenticatedTest";

test("the media type filter narrows mixed views and is kept in the URL", async ({ page }) => {
  await page.goto("/netflix?list=popular");
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
  await page.getByLabel("Genre").selectOption("35");
  await expect(page).toHaveURL(/genre=35/);
  await page.getByLabel("Rating").selectOption("7");
  await expect(page).toHaveURL(/genre=35&rating=7/);
  await expect(page.getByLabel("Genre")).toHaveValue("35");
  await expect(page.getByLabel("Rating")).toHaveValue("7");
});

test("hiding library titles removes them and reports the count", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByLabel("Hide what's already in Plex").click();

  await expect(page).toHaveURL(/hide=1/);
  await expect(page.getByText(/1 hidden because they're already in your library/)).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Popular titles" }).getByText("Fixture Film One"),
  ).toHaveCount(0);
});

test("search finds titles through Seerr", async ({ page }) => {
  await page.goto("/movies");
  await page.getByRole("searchbox", { name: "Search" }).fill("fixture");
  await page.getByRole("searchbox", { name: "Search" }).press("Enter");

  await expect(page).toHaveURL(/\/search\?q=fixture$/);
  await expect(page.getByText(/3 results for “fixture”/)).toBeVisible();
  const grid = page.getByRole("list", { name: "Search results" });
  await expect(grid.getByText("Fixture Series One")).toBeVisible();
  await expect(grid.getByRole("link", { name: /Fixture Film Two/ })).toBeVisible();
});
