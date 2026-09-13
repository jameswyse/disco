import { expect, test } from "@playwright/test";

// The view store is shared by every test in the run, so these tests run in order and restore it.
test.describe.configure({ mode: "serial" });

test("the view library lists Seerr sources with the current sidebar", async ({ page }) => {
  await page.goto("/views");

  await expect(page.getByRole("heading", { name: "Add a view" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Netflix from sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add HBO to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Drama to sidebar" })).toBeVisible();
});

test("adding, reordering and removing a view updates the sidebar", async ({ page }) => {
  await page.goto("/views");
  await page.getByRole("button", { name: "Add HBO to sidebar" }).click();

  const sidebar = page.getByRole("complementary", { name: "Views" });
  await expect(sidebar.getByRole("link", { name: "HBO" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove HBO from sidebar" })).toBeVisible();

  await page.getByRole("button", { name: "Move HBO up" }).click();
  await expect(sidebar.getByRole("link").nth(3)).toHaveAccessibleName("HBO");

  await sidebar.getByRole("link", { name: "HBO" }).click();
  await expect(page).toHaveURL(/\/hbo$/);
  await expect(page.getByText(/Trending on HBO/)).toBeVisible();

  await page.goto("/views");
  await page.getByRole("button", { name: "Remove HBO", exact: true }).click();
  await expect(sidebar.getByRole("link", { name: "HBO" })).toHaveCount(0);
});

test("the library can be searched and filtered by category", async ({ page }) => {
  await page.goto("/views?category=languages");

  await expect(page.getByRole("button", { name: "Add Korean to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search sources" }).fill("heist");
  await page.getByRole("searchbox", { name: "Search sources" }).press("Enter");
  await expect(page).toHaveURL(/q=heist/);
  await expect(page.getByRole("button", { name: "Add heist to sidebar" })).toHaveCount(0);

  await page.getByRole("link", { name: "All" }).click();
  await expect(page.getByRole("button", { name: "Add heist to sidebar" })).toBeVisible();
});
