import { expect, test } from "@playwright/test";

import { seerrFixtureOrigin } from "./browserTestEnvironment";

test("the root redirects to the default view and renders titles from Seerr", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/movies$/);
  await expect(page.getByRole("complementary", { name: "Views" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Movies/ })).toHaveAttribute("aria-current", "page");
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
  await expect(page.getByRole("link", { name: /^Netflix/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("title cards link to the title in Seerr", async ({ page }) => {
  await page.goto("/movies");

  await expect(page.getByRole("link", { name: /Fixture Film One/ })).toHaveAttribute(
    "href",
    `${seerrFixtureOrigin}/movie/101`,
  );
});

test("unknown views show the not found screen", async ({ page }) => {
  await page.goto("/not-a-view");

  await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to browse" })).toBeVisible();
});

test("the add-a-view dialog opens and closes", async ({ page }) => {
  await page.goto("/movies");
  // The sidebar streams in once Seerr responds; wait for it so the click hits the hydrated button.
  await expect(page.getByText("Fixture User")).toBeVisible();
  await page.getByRole("button", { name: "+ Add a view" }).click();

  const dialog = page.getByRole("dialog", { name: "Add a view" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Your sidebar" })).toBeVisible();

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
});

test("health endpoint reports ok when Seerr is configured", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
