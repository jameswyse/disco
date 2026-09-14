import { expect, test } from "./authenticatedTest";

test("the root redirects to the first view and renders titles from Seerr", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/movies$/);
  await expect(page.getByRole("complementary", { name: "Views" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Discover lists" })).toBeVisible();

  await expect(page.getByRole("link", { name: "Movies", exact: true })).toHaveCSS(
    "background-image",
    /4SyDTF02R5BepqSdQmOaNCHObzF/,
  );
  await expect(page.getByRole("link", { name: "TV Shows", exact: true })).toHaveCSS(
    "background-image",
    /ncQ8D4j8GSuL9CzncLEXnhHDxHy/,
  );
  const grid = page.getByRole("list", { name: "Trending titles" });
  await expect(grid.getByText("Fixture Film One")).toBeVisible();
  await expect(grid.getByRole("img", { name: "In Plex" })).toBeVisible();
  await expect(page.getByText("Fixture User")).toBeVisible();
  const sidebar = page.getByRole("complementary", { name: "Views" });
  await expect(sidebar.getByRole("link", { name: /Add a view/ })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Preferences" })).toBeHidden();
  await page.getByText("Fixture User", { exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Requests 3" }),
  ).toBeVisible();
});

test("list tabs change the selected discover list", async ({ page }) => {
  await page.goto("/movies");
  await page.getByRole("link", { name: "Popular" }).click();

  await expect(page).toHaveURL(/\/movies\?list=popular$/);
  await expect(page.getByRole("link", { name: "Popular" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/Popular on Movies · 2 titles/)).toBeVisible();
});

test("the user menu supports keyboard navigation and dismissal", async ({ page }) => {
  await page.goto("/movies");
  const trigger = page.getByLabel("User menu for Fixture User", { exact: true });
  const account = page.getByRole("navigation", { name: "User account" });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(account).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(account.getByRole("link", { name: "Preferences" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(account).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("link", { name: "Popular", exact: true }).click();
  await expect(account).toBeHidden();

  await trigger.click();
  await account.getByRole("link", { name: "Preferences" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(account).toBeHidden();

  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("link", { name: "Browse", exact: true })
    .click();
  await expect(page).toHaveURL(/\/movies$/);
  await trigger.click();
  await account.getByRole("link", { name: "Manage views" }).click();
  await expect(page).toHaveURL(/\/views$/);
  await expect(page.getByRole("heading", { name: "Manage views" })).toBeVisible();
  await expect(account).toBeHidden();
});

test("primary navigation hides the sidebar on Requests and Preferences", async ({ page }) => {
  const navigation = page.getByRole("navigation", { name: "Primary", exact: true });
  const sidebar = page.getByRole("complementary", { name: "Views" });

  await page.goto("/requests");
  await expect(navigation).toBeVisible();
  await expect(sidebar).toBeHidden();
  await expect(
    page.getByRole("banner").getByLabel("User menu for Fixture User", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("User menu for Fixture User", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "User account" })
    .getByRole("link", { name: "Preferences", exact: true })
    .click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(sidebar).toBeHidden();
  await expect(
    page.getByRole("banner").getByLabel("User menu for Fixture User", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(navigation).toBeVisible();
  await expect(sidebar).toBeHidden();

  await page.getByLabel("User menu for Fixture User", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "User account" })
    .getByRole("link", { name: "Manage views", exact: true })
    .click();
  await expect(page).toHaveURL(/\/views$/);
  await expect(sidebar).toBeVisible();
  await navigation.getByRole("link", { name: "Browse", exact: true }).click();
  await expect(page).toHaveURL(/\/movies$/);
  await expect(sidebar).toBeVisible();
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

test("the user menu opens below the top-right trigger on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/requests");
  const banner = page.getByRole("banner");
  const trigger = banner.getByLabel("User menu for Fixture User", { exact: true });
  await trigger.click();
  const menu = banner.getByRole("navigation", { name: "User account" });
  await expect(menu).toBeVisible();
  const triggerBounds = await trigger.boundingBox();
  const menuBounds = await menu.boundingBox();
  expect(triggerBounds).not.toBeNull();
  expect(menuBounds).not.toBeNull();
  expect(triggerBounds?.x).toBeGreaterThan(250);
  expect(menuBounds?.y).toBeGreaterThan((triggerBounds?.y ?? 0) + (triggerBounds?.height ?? 0));
  expect((menuBounds?.x ?? 0) + (menuBounds?.width ?? 0)).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("primary navigation owns the request link and open-count badge", async ({ page }) => {
  await page.goto("/movies");
  const primary = page.getByRole("navigation", { name: "Primary", exact: true });
  await expect(primary.getByRole("link")).toHaveText(["Browse", "Requests 3"]);
  const requests = primary.getByRole("link", { name: "Requests 3", exact: true });
  await expect(requests.getByTitle("3 open requests")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /^Requests/ })).toHaveCount(0);
  await page.getByLabel("User menu for Fixture User", { exact: true }).click();
  const account = page.getByRole("navigation", { name: "User account" });
  await expect(account.getByRole("link")).toHaveText(["Preferences", "Manage views"]);
  await requests.click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(requests).toHaveAttribute("aria-current", "page");
});
