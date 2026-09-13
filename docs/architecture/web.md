# Web source architecture

`apps/web` is a Next.js App Router application with Cache Components enabled. Group code by the
reason it changes:

| Area           | Owner                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| `app`          | Thin routes, layouts, route handlers and metadata. Pages parse URL input and delegate. |
| `features`     | Bounded user contexts: `browse`, `title`, `views`, `search`, `requests`.               |
| `integrations` | Reusable external-system mechanics: the Seerr client, schemas and image URLs.          |
| `platform`     | Application-wide behaviour: configuration and the Effect runtime.                      |

## Seerr integration

`integrations/seerr` wraps Seerr's REST API (`/api/v1`) with `@effect/platform`'s `HttpClient`:

- `schemas.ts` declares Effect `Schema`s for the response bodies Disco reads. Decoding happens
  once, in the client; unknown fields are ignored so Seerr upgrades do not break parsing.
- `client.ts` is an `Effect.Service` (`SeerrClient`) that reads `seerrEnvironmentConfig`, adds the
  `X-Api-Key` header and translates failures into `SeerrUnavailable` (transport), `SeerrRejected`
  (non-2xx) and `SeerrMalformed` (schema) tagged errors. It covers discover, search, details,
  ratings, recommendations, requests (list and create), watchlist and the catalogue endpoints
  (providers, networks, studios, genres, languages, keywords).
- `platform/runtime.ts` holds one `ManagedRuntime` per process with `SeerrClient` and `ViewStore`.
  Loaders (`features/*/load*.ts`) run their Effect programs through it, log failures, and return
  plain discriminated results (`{ kind: "ok" } | { kind: "error" }`) that React can render.
- Posters and logos are TMDB paths; `images.ts` builds CDN URLs and `next/image` is used
  `unoptimized` so the browser loads them directly, as Seerr's own UI does.

## Views

A view is a saved filter shown in the sidebar (`features/views`):

- `views.ts` models `ViewSource` (media type, watch provider, network, studio, genre, language,
  keyword) and the persisted `View`. Networks are series-only and studios film-only on TMDB;
  `viewMediaTypes` encodes that.
- `viewStore.ts` persists `views.json` under `DISCO_DATA_DIR` (default `data/`, `/data` in the
  container) with schema validation on read and an atomic write. Missing file means defaults.
- `library.ts` builds the "Add a view" catalogue from Seerr and caches it for a day with
  `"use cache"`; featured network and studio ids are curated, everything else is live.
- `/views` is the library screen. Add, remove and reorder are server actions in `actions.ts`
  that validate `FormData` with Effect `Schema` and revalidate the layout.

## Browse

A browse screen is `(view, list, filters, page)`:

- `filters.ts` parses grid filters from the URL (`type`, `genre`, `lang`, `rating`, `hide`).
- `browsePlan.ts` is pure: it maps a view, list and filters to the Seerr endpoints to page
  through. Unfiltered media views use Seerr's `trending` and `upcoming` endpoints; anything
  constrained falls back to TMDB discover approximations (popularity over the last year, future
  release dates). View and filter genres combine as "and".
- `loadBrowse.ts` fetches two Seerr pages per browse page, drops people from trending, resolves
  genre names, interleaves movie and series sources round-robin (TMDB popularity is not
  comparable across media types) and applies the hide-in-Plex filter locally.
- `title.ts` maps Seerr results to the `Title` shown on cards; Seerr `MediaInfo.status` becomes
  `Availability`. Ratings with fewer than 10 votes are hidden.
- `TitleCard` is a client component: hovering for 350 ms fetches `/api/titles/[mediaType]/[id]`
  (a `TitlePreview` validated with `Schema` on the client) and shows the preview card with a
  request button.

## Title details

`features/title` renders `/title/[mediaType]/[id]`:

- `titleDetails.ts` maps Seerr's movie and series payloads plus Rotten Tomatoes / IMDb ratings
  into one `TitleDetails` model (scores, cast, seasons with availability, providers for the
  region, requests, downloads, external links).
- `requestTimeline.ts` derives the request → Sonarr/Radarr → Plex steps from media status,
  requests and download progress.
- `actions.ts` exposes `requestTitle` (film, whole series or one season) and `toggleWatchlist`
  as server actions used by `RequestButton` and `WatchlistButton` through `useActionState`.

## Rendering rules

- Pages read `params` and `searchParams`, validate them once (`parseDiscoverListId`,
  `parseBrowseFilters`, `parsePageNumber`, `parseTmdbId`), and pass typed values into a feature
  component.
- Loaders call `connection()` before running Effect programs so the runtime's clock access is
  request-time rather than a prerender error. Request-time parts of the sidebar sit inside
  `Suspense` boundaries; `app/loading.tsx` covers pages.
- Configuration is parsed once with Effect `Config` in `platform/configuration`. `/api/health`
  returns `503 misconfigured` until it parses, so the Docker health check reflects configuration.
- Use relative imports within a feature and `@/` when crossing into another area.

## Testing

- Unit tests cover the pure planning, filter parsing, mapping and timeline modules, view ids,
  and the client's request construction and error translation (with a stub `HttpClient`).
- Browser tests run against `tests/browser/fixtures/seerrServer.ts`, a small Node server that
  serves deterministic Seerr responses, records request and watchlist mutations at
  `/__fixture/requests`, and rejects requests without the fixture API key. Saved views are written
  to `tests/results/data`, which the fixture command clears before each run.
