import { expect, test as base } from "@playwright/test";

import type { Page } from "@playwright/test";

export async function signIn(page: Page, email = "fixture@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/movies$/);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await signIn(page);
    await use(page);
  },
});
export { expect };
