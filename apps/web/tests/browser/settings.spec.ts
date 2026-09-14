import { expect, test } from "./authenticatedTest";

// Settings persist across tests in this run, so mutations run in order and restore defaults.
test.describe.configure({ mode: "serial" });

test("preferences are reachable from the user menu and /settings", async ({ page }) => {
  await page.goto("/movies");
  await page.getByText("Fixture User", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "User account" })
    .getByRole("link", { name: "Preferences" })
    .click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  await expect(page.getByLabel("Quick info on posters")).toBeVisible();

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByLabel("Default language filter")).toBeVisible();
});

test("autosaved preferences retain both selections across changes and reloads", async ({
  page,
}) => {
  await page.goto("/settings");
  const language = page.getByLabel("Default language filter");
  const preview = page.getByLabel("Quick info on posters");

  await language.selectOption("ko");
  await expect(page.getByText(/Views open filtered to Korean/)).toBeVisible();
  await expect(language).toHaveValue("ko");

  await preview.selectOption("button");
  await expect(page.getByText(/Tap or click ⓘ on a poster/)).toBeVisible();
  await expect(language).toHaveValue("ko");
  await expect(preview).toHaveValue("button");

  await page.reload();
  await expect(language).toHaveValue("ko");
  await expect(preview).toHaveValue("button");

  await language.selectOption("");
  await expect(page.getByText("Views open showing every language.")).toBeVisible();
  await preview.selectOption("hover");
  await expect(page.getByText(/Rest the pointer on a poster/)).toBeVisible();
});

test("a default language preference applies to browse filters until overridden", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Default language filter").selectOption("ko");
  await expect(page.getByText(/Views open filtered to Korean/)).toBeVisible();

  await page.goto("/movies?list=popular");
  await page.getByText(/^Filters \d+$/).click();
  await expect(page.getByLabel("Language")).toHaveValue("ko");
  await expect(page.getByLabel("Language").locator("option[value=ko]")).toHaveText(
    "Korean (default)",
  );

  await page.getByLabel("Language").selectOption("any");
  await expect(page).toHaveURL(/lang=any/);
  await expect(page.getByLabel("Language")).toHaveValue("any");

  await page.goto("/settings");
  await page.getByLabel("Default language filter").selectOption("");
  await expect(page.getByText("Views open showing every language.")).toBeVisible();
});

test("quick info can be switched from hover to an explicit button", async ({ page }) => {
  await page.goto("/settings");
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

  await page.goto("/settings");
  await page.getByLabel("Quick info on posters").selectOption("hover");
  await expect(page.getByText(/Rest the pointer on a poster/)).toBeVisible();
});

test("sidebar styles persist and render at 96, 64 and 32 pixels", async ({ page }) => {
  for (const choice of [
    { value: "medium", height: 64, note: "Shorter artwork cards, with more views on screen." },
    { value: "small", height: 32, note: "Compact, single-line rows with view names." },
    { value: "large", height: 96, note: "Large artwork cards in the sidebar." },
  ]) {
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: "Sidebar style", exact: true })
      .selectOption(choice.value);
    await expect(page.getByText(choice.note, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Sidebar style", exact: true })).toHaveValue(
      choice.value,
    );
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Browse", exact: true })
      .click();
    const sidebar = page.getByRole("complementary", { name: "Views" });
    const movies = sidebar.getByRole("link", { name: "Movies", exact: true });
    await expect(movies).toHaveCSS("height", `${choice.height}px`);
    await expect(movies).toHaveCSS(
      "justify-content",
      choice.value === "small" ? "flex-start" : "center",
    );
    await expect(sidebar.getByRole("link", { name: "TV Shows", exact: true })).toHaveCSS(
      "justify-content",
      choice.value === "small" ? "flex-start" : "center",
    );
    const netflix = sidebar.getByRole("link", { name: "Netflix", exact: true });
    await expect(netflix).toHaveCSS("height", `${choice.height}px`);

    if (choice.value === "small") {
      await expect(netflix).toHaveText("Netflix");
      await expect(netflix.locator("img")).toHaveCount(0);
    }

    await expect(page.getByRole("list", { name: "Trending titles" })).toBeVisible();
    await sidebar.screenshot({ path: test.info().outputPath(`sidebar-${choice.value}.png`) });
    await netflix.click();
    await expect(page).toHaveURL(/\/netflix$/);
    await expect(netflix).toHaveAttribute("aria-current", "page");
    await page.goto("/views");
    const reorder = sidebar.getByRole("button", { name: "Reorder Movies", exact: true });
    await expect(reorder).toHaveCSS("height", `${choice.height}px`);
    await expect(sidebar.getByRole("button", { name: "Remove Movies", exact: true })).toBeVisible();
  }
});
