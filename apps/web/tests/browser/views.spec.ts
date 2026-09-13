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

test("preferences are reachable from the sidebar and /settings", async ({ page }) => {
  await page.goto("/movies");
  await page
    .getByRole("complementary", { name: "Views" })
    .getByRole("link", { name: "Preferences" })
    .click();

  await expect(page).toHaveURL(/\/views#preferences$/);
  await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  await expect(page.getByLabel("Quick info on posters")).toBeVisible();

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/views#preferences$/);
  await expect(page.getByLabel("Default language filter")).toBeVisible();
});

test("a default language preference applies to browse filters until overridden", async ({
  page,
}) => {
  await page.goto("/views");
  await page.getByLabel("Default language filter").selectOption("ko");
  await expect(page.getByText(/Views open filtered to Korean/)).toBeVisible();

  await page.goto("/movies?list=popular");
  await expect(page.getByLabel("Language")).toHaveValue("ko");
  await expect(page.getByLabel("Language").locator("option[value=ko]")).toHaveText(
    "Korean (default)",
  );

  await page.getByLabel("Language").selectOption("any");
  await expect(page).toHaveURL(/lang=any/);
  await expect(page.getByLabel("Language")).toHaveValue("any");

  await page.goto("/views");
  await page.getByLabel("Default language filter").selectOption("");
  await expect(page.getByText("Views open showing every language.")).toBeVisible();
});

test("quick info can be switched from hover to an explicit button", async ({ page }) => {
  await page.goto("/views");
  await page.getByLabel("Quick info on posters").selectOption("button");
  await expect(page.getByText(/Tap or click ⓘ on a poster/)).toBeVisible();

  await page.goto("/movies?list=popular");
  const card = page.getByRole("listitem").filter({ hasText: "Fixture Film Two" });
  await card.getByRole("link", { name: /Fixture Film Two/ }).hover();
  await page.waitForTimeout(600);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await card.getByRole("button", { name: "Quick info for Fixture Film Two" }).click();
  await expect(page.getByRole("dialog", { name: "Fixture Film Two quick info" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/views");
  await page.getByLabel("Quick info on posters").selectOption("hover");
  await expect(page.getByText(/Rest the pointer on a poster/)).toBeVisible();
});
