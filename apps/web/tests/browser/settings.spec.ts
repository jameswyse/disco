import { expect, test } from "./authenticatedTest";

import type { Page } from "@playwright/test";

async function chooseSetting(
  page: Page,
  { group, label }: Readonly<{ group: string; label: string }>,
) {
  const radio = page
    .getByRole("group", { name: group })
    .getByRole("radio", { name: label, exact: true });

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/settings",
  );

  await radio.check();
  await saved;

  return radio;
}

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
  await expect(page.getByRole("radio", { name: "Small", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Monochrome", exact: true })).toBeChecked();
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
    { label: "Large", height: 96 },
    { label: "Medium", height: 64 },
    { label: "Small", height: 32 },
  ]) {
    await page.goto("/settings");
    const radio = await chooseSetting(page, { group: "Sidebar style", label: choice.label });
    await page.reload();
    await expect(radio).toBeChecked();
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Browse", exact: true })
      .click();
    const sidebar = page.getByRole("complementary", { name: "Views" });
    const movies = sidebar.getByRole("link", { name: "Movies", exact: true });
    const small = choice.label === "Small";
    await expect(movies).toHaveCSS("height", `${choice.height}px`);
    await expect(movies).toHaveCSS("justify-content", small ? "flex-start" : "center");
    await expect(sidebar.getByRole("link", { name: "TV Shows", exact: true })).toHaveCSS(
      "justify-content",
      small ? "flex-start" : "center",
    );
    const netflix = sidebar.getByRole("link", { name: "Netflix", exact: true });
    await expect(netflix).toHaveCSS("height", `${choice.height}px`);

    if (small) {
      await expect(netflix).toHaveText("Netflix");
      await expect(netflix.locator("img")).toBeVisible();
      await expect(movies.locator("svg")).toBeVisible();
    }

    await expect(page.getByRole("list", { name: "Trending titles" })).toBeVisible();
    await sidebar.screenshot({ path: test.info().outputPath(`sidebar-${choice.label}.png`) });
    await netflix.click();
    await expect(page).toHaveURL(/\/netflix$/);
    await expect(netflix).toHaveAttribute("aria-current", "page");
    await page.goto("/views");
    const reorder = sidebar.getByRole("button", { name: "Reorder Movies", exact: true });
    await expect(reorder).toHaveCSS("height", `${choice.height}px`);
    await expect(sidebar.getByRole("button", { name: "Remove Movies", exact: true })).toBeVisible();
  }
});

test("logo style switches sidebar and library wordmarks between monochrome and colour", async ({
  page,
}) => {
  await page.goto("/settings");
  await chooseSetting(page, { group: "Sidebar style", label: "Large" });

  for (const choice of [
    { label: "Colour", src: /^https:\/\/image\.tmdb\.org\/t\/p\/w300\/[^/]+\.png$/ },
    {
      label: "Monochrome",
      src: /^https:\/\/image\.tmdb\.org\/t\/p\/w300_filter\(duotone,[\da-f]{6},[\da-f]{6}\)\/[^/]+\.png$/,
    },
  ]) {
    await page.goto("/settings");
    const radio = await chooseSetting(page, { group: "Logo style", label: choice.label });
    await page.reload();
    await expect(radio).toBeChecked();
    await page.goto("/movies");
    await expect(
      page
        .getByRole("complementary", { name: "Views" })
        .getByRole("link", { name: "Netflix", exact: true })
        .locator("img"),
    ).toHaveAttribute("src", choice.src);
    await page.goto("/views");
    await expect(
      page.getByRole("button", { name: "Add HBO to sidebar", exact: true }).locator("img"),
    ).toHaveAttribute("src", choice.src);
  }

  await page.goto("/settings");
  await chooseSetting(page, { group: "Sidebar style", label: "Small" });
});
