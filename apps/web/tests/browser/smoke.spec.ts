import { expect, test } from "@playwright/test";

test("browse screen renders the sidebar, lists and title grid", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("complementary", { name: "Views" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Movies/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Discover lists" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Trending/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("list", { name: "Trending titles" })).toBeVisible();
});

test("list tabs change the selected discover list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Popular/ }).click();

  await expect(page).toHaveURL(/list=popular/);
  await expect(page.getByRole("link", { name: /^Popular/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("list", { name: "Popular titles" })).toBeVisible();
});

test("a title card opens its details screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Placeholder limited series/ }).click();

  await expect(page).toHaveURL(/\/title\/tv\/3$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Placeholder limited series");
});

test("unknown titles show the not found screen", async ({ page }) => {
  // The static shell streams first under Cache Components, so the status stays 200.
  await page.goto("/title/tv/999");

  await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to browse" })).toBeVisible();
});

test("the add-a-view dialog opens and closes", async ({ page }) => {
  await page.goto("/");
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
