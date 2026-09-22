import { expect, test } from "./authenticatedTest";
import { seerrFixtureOrigin } from "./browserTestEnvironment";

for (const width of [390, 1440]) {
  test(`startup shows the animated brand and honours reduced motion at ${width}px`, async ({
    page,
  }, testInfo) => {
    const reduceMotion = width === 390;
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: reduceMotion ? "reduce" : "no-preference" });
    const session = (await page.context().cookies()).find(
      (cookie) => cookie.name === "disco_session",
    );

    if (!session) {
      throw new Error("Sign-in did not set its session cookie");
    }

    const headers = { Cookie: `connect.sid=${session.value}` };
    await page.request.post(`${seerrFixtureOrigin}/__fixture/hold-session`, { headers });

    try {
      await page.goto("/movies", { waitUntil: "commit" });
      const loader = page.getByRole("status", { name: "Loading Disco", exact: true });
      await expect(loader).toBeVisible();
      const bounds = await loader.boundingBox();
      expect(bounds).toMatchObject({ x: 0, y: 0, width, height: 900 });
      await expect(loader.getByRole("checkbox", { name: "Pause loading animation" })).toHaveCount(
        0,
      );
      await expect(loader.getByText("Disco", { exact: true })).toHaveCount(0);
      const image = loader.locator("img");
      await expect(image).toBeVisible();

      if (reduceMotion) {
        await expect
          .poll(() =>
            image.evaluate((element: HTMLImageElement) => new URL(element.currentSrc).pathname),
          )
          .toBe("/brand/disco-logo.webp");
        expect(
          await page.evaluate(() =>
            performance
              .getEntriesByType("resource")
              .some((resource) => resource.name.endsWith("disco-logo-animated.webp")),
          ),
        ).toBe(false);
      } else {
        await expect
          .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
          .toBeGreaterThan(0);
        const firstFrame = await image.screenshot();
        await expect
          .poll(async () => Buffer.compare(firstFrame, await image.screenshot()))
          .not.toBe(0);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect
          .poll(() =>
            image.evaluate((element: HTMLImageElement) => new URL(element.currentSrc).pathname),
          )
          .toBe("/brand/disco-logo.webp");
        await expect(image).toBeVisible();
      }

      await page.screenshot({ path: testInfo.outputPath("disco-loading.png") });
    } finally {
      await page.request.delete(`${seerrFixtureOrigin}/__fixture/hold-session`, { headers });
    }

    await expect(page.getByRole("list", { name: "Trending titles" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading Disco", exact: true })).toBeHidden();
  });
}
