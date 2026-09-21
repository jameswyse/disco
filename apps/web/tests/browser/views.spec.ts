import { Deferred, Effect } from "effect";

import { expect, test } from "./authenticatedTest";

import type { Locator, Page } from "@playwright/test";

async function dragView(
  page: Page,
  source: Locator,
  target: Locator,
  position: { x: number; y: number } = { x: 12, y: 12 },
) {
  await source.hover();
  await page.mouse.down();
  // Start dragging before scrolling the sidebar to reveal the destination.
  await source.hover({ position: { x: 8, y: 8 } });
  await target.hover({ position });
  await target.hover({ position });
  await page.mouse.up();
}

// The view store is shared by every test in the run, so these tests run in order and restore it.
test.describe.configure({ mode: "serial" });

test("the view library lists Seerr sources with the current sidebar", async ({ page }) => {
  await page.goto("/views");

  await expect(page.getByRole("heading", { name: "Manage views" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your sidebar" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Preferences" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove Netflix", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add HBO to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Drama to sidebar" })).toBeVisible();
});

test("adding and removing a view updates the sidebar, with links only outside Manage views", async ({
  page,
}) => {
  await page.goto("/views");
  await page.getByRole("button", { name: "Add HBO to sidebar" }).click();

  const sidebar = page.getByRole("complementary", { name: "Views" });
  await expect(sidebar.getByRole("button", { name: "Reorder HBO", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("list", { name: "Sidebar views" }).getByRole("link")).toHaveCount(
    0,
  );
  await expect(sidebar.getByRole("button", { name: /^Move .* (up|down)$/ })).toHaveCount(0);
  await sidebar.getByRole("button", { name: "Reorder HBO", exact: true }).click();
  await expect(page).toHaveURL(/\/views$/);

  await page.goto("/movies");
  await sidebar.getByRole("link", { name: "HBO", exact: true }).click();
  await expect(page).toHaveURL(/\/hbo$/);
  await expect(
    page.getByRole("heading", { name: "These titles are already requested" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Show hidden titles", exact: true }).click();
  await expect(page.getByText(/Trending on HBO/)).toBeVisible();

  await page.goto("/views");
  await page.getByRole("button", { name: "Remove HBO", exact: true }).click();
  await expect(sidebar.getByRole("button", { name: "Reorder HBO", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("list", { name: "Sidebar views" })).toHaveAttribute(
    "aria-busy",
    "false",
  );
});

test("the library searches the supported source categories", async ({ page }) => {
  await page.goto("/views?category=networks");
  await expect(page.getByRole("button", { name: "Add HBO to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Languages", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Keywords", exact: true })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search sources" }).fill("Stan");
  await page.getByRole("searchbox", { name: "Search sources" }).press("Enter");
  await expect(page).toHaveURL(/q=Stan/);
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toHaveCount(0);
  await page.getByRole("link", { name: "All", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search sources" }).fill("heist");
  await page.getByRole("searchbox", { name: "Search sources" }).press("Enter");
  await expect(page.getByRole("button", { name: "Add heist to sidebar" })).toHaveCount(0);
});

test("dragging inserts and reorders views in the actual sidebar and persists the order", async ({
  page,
}) => {
  await page.goto("/views");
  const sidebar = page.getByRole("complementary", { name: "Views" });
  const cards = sidebar.getByRole("button", { name: /^Reorder / });
  await page
    .getByRole("listitem", { name: "HBO", exact: true })
    .locator("[draggable=true]")
    .dragTo(sidebar.getByRole("button", { name: "Reorder TV Shows", exact: true }));
  await expect(cards.nth(1)).toHaveAccessibleName("Reorder HBO");
  await expect(sidebar.getByRole("list", { name: "Sidebar views" })).toHaveAttribute(
    "aria-busy",
    "false",
  );

  const dropArea = sidebar.getByRole("list", { name: "Sidebar views" }).locator("..");
  const dropBounds = await dropArea.boundingBox();

  if (dropBounds === null) {
    throw new Error("Sidebar drop area is not visible");
  }

  await dragView(
    page,
    sidebar.getByRole("button", { name: "Reorder HBO", exact: true }),
    dropArea,
    // Target the empty gutter even when cards fill the sidebar's height.
    { x: 2, y: dropBounds.height - 12 },
  );
  await expect(cards.last()).toHaveAccessibleName("Reorder HBO");
  await expect(sidebar.getByRole("list", { name: "Sidebar views" })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await dragView(
    page,
    sidebar.getByRole("button", { name: "Reorder HBO", exact: true }),
    sidebar.getByRole("button", { name: "Reorder TV Shows", exact: true }),
  );
  await expect(cards.nth(1)).toHaveAccessibleName("Reorder HBO");
  await expect(sidebar.getByRole("list", { name: "Sidebar views" })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.reload();
  await expect(cards.nth(1)).toHaveAccessibleName("Reorder HBO");
  await sidebar.getByRole("button", { name: "Reorder HBO", exact: true }).focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(cards.nth(2)).toHaveAccessibleName("Reorder HBO");

  await expect(sidebar.getByRole("list", { name: "Sidebar views" })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await dragView(
    page,
    sidebar.getByRole("button", { name: "Reorder HBO", exact: true }),
    page.getByRole("heading", { name: "Manage views" }),
  );
  await expect(sidebar.getByRole("button", { name: "Reorder HBO", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add HBO to sidebar" })).toBeVisible();
  await expect(sidebar.getByRole("list", { name: "Sidebar views" })).toHaveAttribute(
    "aria-busy",
    "false",
  );
});

test("view changes appear before saving and roll back when the save fails", async ({ page }) => {
  await page.goto("/views");
  const sidebar = page.getByRole("complementary", { name: "Views" });
  const saved = sidebar.getByRole("list", { name: "Sidebar views" });
  const gate = Effect.runSync(Deferred.make<void>());
  await page.route("**/views", async (route) => {
    if (route.request().method() === "POST") {
      await Effect.runPromise(Deferred.await(gate));
    }

    await route.continue();
  });

  try {
    await page.getByRole("button", { name: "Add Stan to sidebar" }).click();
    await expect(sidebar.getByRole("button", { name: "Reorder Stan", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toHaveCount(0);
    await expect(saved).toHaveAttribute("aria-busy", "true");
  } finally {
    Effect.runSync(Deferred.succeed(gate, undefined));
  }

  await expect(saved).toHaveAttribute("aria-busy", "false");
  await page.unroute("**/views");
  await page.reload();
  await expect(sidebar.getByRole("button", { name: "Reorder Stan", exact: true })).toBeVisible();

  const reorderGate = Effect.runSync(Deferred.make<void>());
  await page.route("**/views", async (route) => {
    if (route.request().method() === "POST") {
      await Effect.runPromise(Deferred.await(reorderGate));
    }

    await route.continue();
  });

  try {
    await dragView(
      page,
      sidebar.getByRole("button", { name: "Reorder Stan", exact: true }),
      sidebar.getByRole("button", { name: "Reorder TV Shows", exact: true }),
    );
    await expect(saved.getByRole("button", { name: /^Reorder / }).nth(1)).toHaveAccessibleName(
      "Reorder Stan",
    );
    await expect(saved).toHaveAttribute("aria-busy", "true");
  } finally {
    Effect.runSync(Deferred.succeed(reorderGate, undefined));
  }

  await expect(saved).toHaveAttribute("aria-busy", "false");
  await page.unroute("**/views");

  await page.route("**/views", async (route) => {
    if (route.request().method() === "POST") {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await sidebar.getByRole("button", { name: "Remove Stan", exact: true }).click();
  await expect(sidebar.getByRole("alert")).toContainText("Your change was undone");
  await expect(sidebar.getByRole("button", { name: "Reorder Stan", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toHaveCount(0);
  await page.unroute("**/views");
  await sidebar.getByRole("button", { name: "Remove Stan", exact: true }).click();
  await expect(saved).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toBeVisible();
});

test("streaming country changes the available services without changing the sidebar", async ({
  page,
}) => {
  await page.goto("/views?category=streaming");
  await expect(page.getByRole("combobox", { name: "Streaming country" })).toHaveValue("AU");
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Netflix to sidebar" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Streaming country" }).selectOption("US");
  await expect(page).toHaveURL(/country=US/);
  await expect(page.getByRole("button", { name: "Add Hulu to sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toHaveCount(0);
  await expect(
    page
      .getByRole("complementary", { name: "Views" })
      .getByRole("button", { name: "Reorder Netflix", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Genres", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Streaming country" })).toHaveCount(0);
  await page.getByRole("link", { name: "Streaming", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Streaming country" })).toHaveValue("US");
  await page.getByRole("link", { name: "All", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Streaming country" })).toHaveValue("US");
  await page.getByRole("combobox", { name: "Streaming country" }).selectOption("AU");
  await expect(page.getByRole("button", { name: "Add Stan to sidebar" })).toBeVisible();
});
