import { expect, test } from "./authenticatedTest";
import { seerrFixtureOrigin } from "./browserTestEnvironment";

import type { APIRequestContext } from "@playwright/test";

/** Assert against the mutations the fixture Seerr has recorded so far. */
async function expectRecorded(
  request: APIRequestContext,
  expected: Readonly<{ requests?: unknown; watchlist?: unknown }>,
): Promise<void> {
  const response = await request.get(`${seerrFixtureOrigin}/__fixture/requests`);
  const body: unknown = await response.json();

  expect(body).toMatchObject(expected);
}

for (const { mediaType, existingId, missingId } of [
  { mediaType: "movie", existingId: 105, missingId: 106 },
  { mediaType: "tv", existingId: 203, missingId: 204 },
]) {
  test(`a supporting 404 does not hide an existing ${mediaType}`, async ({ page, context }) => {
    const preview = await context.request.get(`/api/titles/${mediaType}/${existingId}`);
    expect(preview.status()).toBe(502);
    expect(await preview.json()).toMatchObject({
      kind: "error",
      message: expect.stringContaining(`${mediaType}/${existingId}/recommendations`),
    });
    await page.goto(`/title/${mediaType}/${existingId}`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      `${mediaType}/${existingId}/recommendations`,
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

    const missing = await context.request.get(`/api/titles/${mediaType}/${missingId}`);
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toEqual({ kind: "not-found" });
    await page.goto(`/title/${mediaType}/${missingId}`);
    await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  });
}

test("a title card opens the details screen", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByRole("link", { name: /Fixture Film Two/ }).click();

  await expect(page).toHaveURL(/\/title\/movie\/102$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fixture Film Two");
  await expect(page.getByText("Not yet requested.")).toBeVisible();
  await expect(page.getByText("91%")).toBeVisible();
  await expect(page.getByText("Fixture Actor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "More like this" })).toBeVisible();
});

test("requesting a film posts to Seerr and shows the requested state", async ({
  page,
  request,
}) => {
  await page.goto("/title/movie/102");
  await page.getByRole("button", { name: "↓ Request" }).click();
  await page.getByRole("button", { name: "Confirm request" }).click();

  await expect(page.getByText("✓ Requested")).toBeVisible();
  await expectRecorded(request, {
    requests: expect.arrayContaining([{ mediaType: "movie", mediaId: 102, userId: 2 }]),
  });
});

for (const width of [320, 1440]) {
  test(`sparse title details keep known information and actions together at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/title/movie/1765392");
    const article = page.getByRole("article");
    const heading = page.getByRole("heading", { level: 1, name: "Call Me Tim (2026)" });
    await expect(heading).toBeVisible();
    await expect(article.getByRole("button", { name: "↓ Request", exact: true })).toBeVisible();
    await expect(article.getByRole("link", { name: "Open in Seerr" })).toBeVisible();
    await expect(article.getByRole("heading", { name: "Details", exact: true })).toBeVisible();
    await expect(article.getByRole("definition").filter({ hasText: /^en$/ })).toBeVisible();
    await expect(article.locator("img:visible")).toHaveCount(0);
    await expect(
      article.getByRole("heading", { name: /Overview|Cast|Where to watch|Keywords/ }),
    ).toHaveCount(0);

    const articleBounds = await article.boundingBox();
    const headingBounds = await heading.boundingBox();
    const detailsBounds = await article
      .getByRole("heading", { name: "Details", exact: true })
      .boundingBox();

    if (!articleBounds || !headingBounds || !detailsBounds) {
      throw new Error("Title information is not visible");
    }

    expect(headingBounds.y - articleBounds.y).toBeLessThan(120);
    expect(headingBounds.x - articleBounds.x).toBeLessThan(40);
    expect(detailsBounds.x - articleBounds.x).toBeLessThan(60);
    expect(articleBounds.x + articleBounds.width).toBeLessThanOrEqual(width);
  });
}

test("a title with no facts omits empty panels and keeps its actions", async ({ page }) => {
  await page.goto("/title/movie/1765393");
  const article = page.getByRole("article");
  await expect(article.getByRole("heading", { level: 1, name: "Title only" })).toBeVisible();
  await expect(article.getByRole("heading", { name: /Details|Where to watch/ })).toHaveCount(0);
  await expect(article.getByRole("button", { name: "↓ Request", exact: true })).toBeVisible();
  await expect(article.getByRole("link", { name: "TMDB", exact: true })).toBeVisible();
});

test("series show seasons with their status and per-season requests", async ({ page, request }) => {
  await page.goto("/title/tv/201");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fixture Series One");
  await expect(page.getByText("Limited series")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Request status/ })).toBeVisible();
  await expect(page.getByRole("list").getByText("Searching", { exact: true })).toBeVisible();

  const seasonTwo = page.getByRole("listitem").filter({ hasText: "Season 2" });
  await seasonTwo.getByRole("button", { name: "Request" }).click();
  await page.getByRole("button", { name: "Confirm request" }).click();

  await expect(seasonTwo.getByText("✓ Requested")).toBeVisible();
  await expectRecorded(request, {
    requests: expect.arrayContaining([{ mediaType: "tv", mediaId: 201, seasons: [2], userId: 2 }]),
  });
});

for (const width of [320, 1440]) {
  test(`every season expands with episode information at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const artworkUrls = [
      "https://image.tmdb.org/t/p/w500/outside.jpg",
      "https://artworks.thetvdb.com/banners/v4/episode/8868133/screencap/61fcad53ee9f2.jpg",
    ];

    for (const url of artworkUrls) {
      await page.route(url, (route) =>
        route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#334155"/></svg>',
        }),
      );
    }

    await page.goto("/title/tv/201");
    const first = page.getByRole("button", { name: /^Season 1/ });
    const second = page.getByRole("button", { name: /^Season 2/ });
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await first.focus();
    await page.keyboard.press("Enter");
    const firstEpisodes = page.getByRole("list", { name: "Season 1 episodes" });
    await expect(firstEpisodes.getByRole("heading")).toHaveText([
      "4 - Outside",
      "3 - Missing",
      "2 - The clue",
      "1 - Arrival",
    ]);
    await expect(firstEpisodes.getByText("The truth finally comes to light.")).toBeVisible();
    await expect(firstEpisodes.getByText("3 Apr 2025")).toBeVisible();
    await expect(firstEpisodes.locator("img").first()).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w500/outside.jpg",
    );
    await expect(firstEpisodes.locator("img").last()).toHaveAttribute(
      "src",
      "https://artworks.thetvdb.com/banners/v4/episode/8868133/screencap/61fcad53ee9f2.jpg",
    );

    for (const still of await firstEpisodes.locator("img").all()) {
      await still.scrollIntoViewIfNeeded();
      await expect(still).toHaveJSProperty("naturalWidth", 320);
    }

    await second.click();
    const secondEpisodes = page.getByRole("list", { name: "Season 2 episodes" });
    await expect(secondEpisodes.getByRole("heading")).toHaveText([
      "4 - Episode 4",
      "3 - Home",
      "2 - The crossing",
      "1 - Return",
    ]);
    const sparseEpisode = secondEpisodes.getByRole("listitem").first();
    await expect(sparseEpisode.locator("img, time, p")).toHaveCount(0);
    await expect(firstEpisodes).toBeVisible();
    const bounds = await secondEpisodes.boundingBox();

    if (!bounds) {
      throw new Error("Episode list is not visible");
    }

    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("season-episodes.png") });
    await first.click();
    await expect(firstEpisodes).toBeHidden();
    await first.focus();
    await page.keyboard.press("Space");
    await expect(firstEpisodes.getByRole("heading", { name: "4 - Outside" })).toBeVisible();
  });
}

test("empty and unavailable seasons keep the rest of the title usable", async ({ page }) => {
  await page.goto("/title/tv/202");
  await page.getByRole("button", { name: /^Season 3/ }).click();
  await expect(page.getByText("No episode information is available yet.")).toBeVisible();
  await page.getByRole("button", { name: /^Season 4/ }).click();
  await expect(page.getByRole("article").getByRole("alert")).toHaveText(
    "Episode information could not be loaded.",
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("article").getByRole("alert")).toHaveText(
    "Episode information could not be loaded.",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fixture Series One");
  await expect(page.getByText("No episode information is available yet.")).toBeVisible();
});

test("the watchlist button toggles through Seerr", async ({ page, request }) => {
  await page.goto("/title/movie/102");
  await page.getByRole("button", { name: "Add to watchlist" }).click();

  await expect(page.getByRole("button", { name: "Remove from watchlist" })).toBeVisible();
  await expectRecorded(request, {
    watchlist: expect.arrayContaining([
      { tmdbId: 102, mediaType: "movie", title: "Fixture Film Two", userId: 2 },
    ]),
  });
});

test("hovering a card opens a preview with details", async ({ page }) => {
  await page.goto("/movies?list=popular");
  await page.getByRole("link", { name: /Fixture Film Two/ }).hover();

  const preview = page.getByRole("dialog");
  await expect(preview).toBeVisible();
  await expect(preview.getByText("A second film that nobody has requested yet.")).toBeVisible();
  await expect(preview.getByText("Fixture Actor")).toBeVisible();
  await expect(preview.getByRole("link", { name: "Details" })).toHaveAttribute(
    "href",
    "/title/movie/102",
  );
});

test("the requests page shows one combined status per request", async ({ page }) => {
  await page.goto("/requests");

  const list = page.getByRole("list", { name: "Requests" });
  await expect(list.getByText("Fixture Series One")).toBeVisible();
  await expect(
    list
      .getByRole("listitem")
      .filter({ hasText: "Fixture Series One" })
      .getByText("Processing", { exact: true }),
  ).toBeVisible();
  await expect(
    list
      .getByRole("listitem")
      .filter({ hasText: "Call Me Tim" })
      .getByText("Declined", { exact: true }),
  ).toBeVisible();
  await expect(
    list
      .getByRole("listitem")
      .filter({ hasText: "Fixture Film One" })
      .getByText("Available", { exact: true }),
  ).toBeVisible();
  await expect(list.getByText(/^(Approved|Completed|Not yet|In Plex)$/)).toHaveCount(0);
  await expect(
    page
      .getByRole("main")
      .locator("footer")
      .getByText(/^Requests · page/),
  ).toBeVisible();
  await expect(page.getByRole("banner").getByRole("combobox")).toHaveCount(1);
});

test("quality profile is sent with a season request and appears on existing requests", async ({
  page,
  request,
}) => {
  await page.goto("/title/tv/201");
  await expect(page.getByText(/Quality profile · HD-1080p/)).toBeVisible();
  const season = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: /^Season 2/ }) });
  await season.getByRole("button", { name: "Request", exact: true }).click();
  await page.getByLabel("Quality profile", { exact: true }).selectOption("0:2");
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(season.getByText("✓ Requested")).toBeVisible();
  const recorded: unknown = await (
    await request.get(`${seerrFixtureOrigin}/__fixture/requests`)
  ).json();
  expect(recorded).toMatchObject({
    requests: expect.arrayContaining([
      {
        mediaType: "tv",
        mediaId: 201,
        seasons: [2],
        profileId: 2,
        serverId: 0,
        is4k: false,
        userId: 2,
      },
    ]),
  });
  await page.goto("/requests");
  await expect(page.getByRole("list", { name: "Requests" }).getByText(/HD-1080p/)).toBeVisible();
});

test("a request dialog opened from a hover card stays open", async ({ page }) => {
  await page.goto("/movies?list=popular");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: /Fixture Film Two/ }) });
  await card.getByRole("button", { name: /info/i }).click();
  await card.getByRole("button", { name: /Request/ }).click();
  const dialog = page.getByRole("dialog", { name: "Request title", exact: true });
  await expect(dialog).toBeVisible();
  await page.mouse.move(5, 5);
  await dialog.getByLabel("Quality profile").selectOption("0:2");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

for (const width of [320, 1440]) {
  test(`aired episode availability uses automatically discovered Plex at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/title/tv/205");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Airing and up to date");
    await expect(page.getByText("All 6 aired episodes available").first()).toBeVisible();
    await expect(page.getByText("Next episode airs 20 September")).toBeVisible();
    await expect(page.getByRole("link", { name: "▶ Watch", exact: true })).toBeVisible();
    const nextSeason = page.getByRole("listitem").filter({ hasText: "Season 2" });
    await expect(nextSeason.getByText("Not yet aired", { exact: true })).toBeVisible();
    await expect(nextSeason.getByRole("button", { name: "Request", exact: true })).toBeVisible();
    const preview = await context.request.get("/api/titles/tv/205");
    expect(await preview.json()).toMatchObject({
      availability: "up-to-date",
      availabilityDetail: "All 6 aired episodes available",
    });
    expect(await preview.text()).not.toContain("plex-fixture-token");

    await page.goto("/title/tv/206");
    await expect(page.getByText("4 of 6 aired episodes available").first()).toBeVisible();
    await expect(page.getByText("Partly Available", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Next episode airs 20 September")).toBeVisible();
    await expect(page.getByText("Up to date", { exact: true })).toHaveCount(0);
  });
}
