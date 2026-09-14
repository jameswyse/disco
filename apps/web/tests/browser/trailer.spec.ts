import { expect, test } from "./authenticatedTest";

const youtubePlayerScript = `window.YT = { Player: class {
          constructor(iframe, options) {
            this.iframe = iframe;
            this.events = options.events;
            this.state = -1;
            queueMicrotask(() => this.events.onReady({ target: this }));
          }
          playVideo() {
            this.state = 1;
            this.iframe.contentWindow.postMessage("Playing", "https://www.youtube.com");
            this.events.onStateChange({ data: 1 });
          }
          pauseVideo() {
            this.state = 2;
            this.iframe.contentWindow.postMessage("Paused", "https://www.youtube.com");
            this.events.onStateChange({ data: 2 });
          }
          getPlayerState() { return this.state; }
          destroy() { this.iframe.remove(); }
        }};
        window.onYouTubeIframeAPIReady();`;

for (const width of [390, 1440]) {
  test(`trailers play in-page and close from quick info and details at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("https://www.youtube.com/iframe_api", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: youtubePlayerScript,
      }),
    );
    await page.route("https://www.youtube.com/embed/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><body style="background:#000;color:#fff"><p>Playing</p><script>
          window.addEventListener("message", (event) => {
            document.querySelector("p").textContent = event.data;
          });
        </script></body></html>`,
      }),
    );
    await page.goto("/movies?list=popular");
    await page.getByRole("button", { name: "Quick info for Fixture Film Two" }).click();
    const quickInfo = page.getByRole("dialog", { name: "Fixture Film Two quick info" });
    await quickInfo.getByRole("button", { name: "▶ Trailer", exact: true }).click();
    const trailer = page.getByRole("dialog", { name: "Fixture Film Two trailer", exact: true });
    const video = page.getByTitle("Fixture Film Two trailer video", { exact: true });
    await expect(trailer).toBeVisible();
    await expect(video).toHaveAttribute(
      "src",
      /^https:\/\/www.youtube.com\/embed\/fixture102\?autoplay=1&playsinline=1&controls=0&fs=1&rel=0&enablejsapi=1&origin=/,
    );
    await expect(video).toHaveAttribute("allowfullscreen", "");
    await expect(video).toHaveAttribute("allow", /autoplay.*fullscreen/);
    const bounds = await video.boundingBox();
    expect(bounds?.width).toBeCloseTo(width * 0.9, 0);
    expect(bounds?.height).toBeCloseTo(900 * 0.9, 0);
    await expect(trailer.getByRole("heading")).toHaveCount(0);
    const playerContent = page.frameLocator('iframe[title="Fixture Film Two trailer video"]');
    await expect(playerContent.getByText("Playing", { exact: true })).toBeVisible();
    await trailer.getByRole("button", { name: "Pause trailer", exact: true }).click();
    await expect(playerContent.getByText("Paused", { exact: true })).toBeVisible();
    await trailer.getByRole("button", { name: "Play trailer", exact: true }).click();
    await expect(playerContent.getByText("Playing", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/movies\?list=popular$/);
    await page.screenshot({ path: testInfo.outputPath("trailer.png") });
    await trailer.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await trailer.getByRole("button", { name: "Close trailer" }).click();
    await expect(video).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await expect(quickInfo).toBeVisible();
    await expect(quickInfo.getByRole("button", { name: "▶ Trailer", exact: true })).toBeFocused();

    await quickInfo.getByRole("link", { name: "Details", exact: true }).click();
    const play = page.getByRole("button", { name: "▶ Play trailer", exact: true });
    await play.click();
    await expect(trailer).toBeVisible();
    // Playback controls keep focus in the page, so Escape still closes the player.
    await trailer.getByRole("button", { name: "Pause trailer", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(video).toHaveCount(0);
    await expect(play).toBeFocused();
    await play.click();
    await expect(video).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(video).toHaveCount(0);
    await expect(trailer).toBeHidden();
    await expect(page).toHaveURL(/\/title\/movie\/102$/);
  });
}

test("closing while the trailer API loads leaves no player behind and can reopen", async ({
  page,
}) => {
  let finishLoading: (() => void) | undefined;
  const loading = new Promise<void>((resolve) => {
    finishLoading = resolve;
  });
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    await loading;
    await route.fulfill({ contentType: "application/javascript", body: youtubePlayerScript });
  });
  await page.route("https://www.youtube.com/embed/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Trailer</p>" }),
  );
  await page.goto("/title/movie/102");
  const play = page.getByRole("button", { name: "▶ Play trailer", exact: true });
  const video = page.getByTitle("Fixture Film Two trailer video", { exact: true });
  await play.click();
  await expect(page.getByRole("status")).toHaveText("Loading trailer…");
  await page.getByRole("button", { name: "Close trailer" }).click();
  await expect(video).toHaveCount(0);
  finishLoading?.();
  await play.click();
  await expect(page.getByRole("button", { name: "Pause trailer", exact: true })).toBeEnabled();
  await expect(video).toHaveCount(1);
  await page.getByRole("button", { name: "Close trailer" }).click();
  await expect(video).toHaveCount(0);
});
