import { expect, test } from "@playwright/test";

test("the root redirects to the first view and renders titles from Seerr", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/movies$/);
  await expect(page.getByRole("complementary", { name: "Views" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Discover lists" })).toBeVisible();

  const grid = page.getByRole("list", { name: "Trending titles" });
  await expect(grid.getByText("Fixture Film One")).toBeVisible();
  await expect(grid.getByRole("img", { name: "In Plex" })).toBeVisible();
  await expect(page.getByText("Fixture User")).toBeVisible();
  await expect(page.getByText("3 open requests · 1 pending approval")).toBeVisible();
});

test("list tabs change the selected discover list", async ({ page }) => {
  await page.goto("/movies");
  await page.getByRole("link", { name: "Popular" }).click();

  await expect(page).toHaveURL(/\/movies\?list=popular$/);
  await expect(page.getByRole("link", { name: "Popular" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/Popular on Movies · 2 titles/)).toBeVisible();
});

test("provider views mix movies and series", async ({ page }) => {
  await page.goto("/netflix?list=popular");

  const grid = page.getByRole("list", { name: "Popular titles" });
  await expect(grid.getByText("Fixture Film One")).toBeVisible();
  await expect(grid.getByText("Fixture Series One")).toBeVisible();
  await expect(grid.getByRole("img", { name: "Requested" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Netflix" })).toHaveAttribute("aria-current", "page");
});

test("unknown views show the not found screen", async ({ page }) => {
  await page.goto("/not-a-view");

  await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to browse" })).toBeVisible();
});

test("health endpoint reports ok when Seerr is configured", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("cards show runtime for films and season counts for series", async ({ page }) => {
  await page.goto("/netflix?list=popular");

  const grid = page.getByRole("list", { name: "Popular titles" });
  await expect(grid.getByRole("link", { name: /Fixture Film One/ })).toContainText("1h 58m");
  await expect(grid.getByRole("link", { name: /Fixture Series One/ })).toContainText("2 seasons");
});
