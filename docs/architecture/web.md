# Web source architecture

`apps/web` is a Next.js App Router application with Cache Components enabled. Group code by the
reason it changes:

| Area           | Owner                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app`          | Thin routes, layouts, route handlers and metadata. Pages parse URL input and delegate.                                                             |
| `features`     | Bounded user contexts: `auth`, `browse`, `title`, `person`, `views`, `search`, `requests`; shared feedback components live in `features/feedback`. |
| `integrations` | Reusable external-system mechanics: the Seerr client, schemas and image URLs.                                                                      |
| `platform`     | Application-wide behaviour: configuration, page-number validation and the Effect runtime.                                                          |

## Seerr integration

`integrations/seerr` wraps Seerr's REST API (`/api/v1`) with `@effect/platform`'s `HttpClient`:

- `schemas.ts` declares Effect `Schema`s for the response bodies Disco reads. Decoding happens
  once, in the client; unknown fields are ignored so Seerr upgrades do not break parsing.
- `client.ts` is an `Effect.Service` (`SeerrClient`) that reads `seerrEnvironmentConfig`, adds the
  `X-Api-Key` and mandatory `X-API-User` headers from a request-scoped `SeerrIdentity`, and translates failures into `SeerrUnavailable` (transport), `SeerrRejected`
  (non-2xx) and `SeerrMalformed` (schema) tagged errors. It covers discover, search, details,
  ratings, recommendations, requests (list and create), watchlist and the catalogue endpoints
  (providers, streaming regions, networks, studios, genres, languages, keywords).
- `platform/runtime.ts` holds one `ManagedRuntime` per process with `SeerrClient`, `SeerrAuth`, `ViewStore` and `SettingsStore`. User identity is never stored in that runtime.
  Loaders (`features/*/load*.ts`) use `runAuthenticated` to verify the Seerr session before running their Effect programs, log failures, and return
  plain discriminated results (`{ kind: "ok" } | { kind: "error" }`) that React can render.
- Posters and logos are TMDB paths; `images.ts` builds CDN URLs and `next/image` is used
  `unoptimized` so the browser loads them directly, as Seerr's own UI does.

## Authentication

- `features/auth` renders `/login` from Seerr's anonymous `/settings/public` response. `LoginSettings`
  admits local sign-in, media-server sign-in, or both. Disabling both fails boundary decoding.
  Plex is shown only when media-server sign-in is enabled and `mediaServerType` is Plex.
- `integrations/plex/signIn.ts` opens Plex's authorisation window and polls its strong PIN until
  completion, expiry or cancellation. The browser sends the resulting token to a server action.
- `integrations/seerr/auth.ts` delegates local credentials and Plex tokens to Seerr's login APIs.
  It forwards Seerr's CSRF cookie/token pair when present. Login, logout and session verification
  use no API key. Credentials and upstream request errors are not logged.
- `platform/auth/session.ts` carries Seerr's signed session in Disco's host-only, HttpOnly,
  SameSite=Lax `disco_session` cookie, marked Secure on HTTPS. Seerr remains the session authority.
  `readSession` verifies `/auth/me` using only that cookie, deduplicated within a React request.
  Expired or rejected sessions cannot fall back to API-key authentication.
- `runAuthenticated` provides the verified user ID and CSRF credentials to each Effect operation.
  All API-key requests require that identity; public status and settings calls use no credentials.
  User IDs supplied by browser headers or form fields are never used for attribution.
- `app/(authenticated)` owns the browsing shell. Each data loader and server action also checks
  the session at its operation boundary. The title-preview route returns 401 without a valid session
  and marks responses `private, no-store`.
- Cached catalogue and title-fact reads verify the session before entering the cache.
  Cache keys include the verified user ID; session and CSRF secrets are never cached by Next.
- Sign-out invalidates the upstream Seerr session before clearing Disco's cookie. Account creation
  and password resets stay in Seerr. Saved views and Disco preferences remain instance-wide files.

## Views

A view is a saved filter shown in the sidebar (`features/views`):

- `views.ts` models `ViewSource` (media type, watch provider, network, studio, genre, language,
  keyword) and the persisted `View`. Networks are series-only and studios film-only on TMDB;
  `viewMediaTypes` encodes that.
- `viewStore.ts` persists `views.json` under `DISCO_DATA_DIR` (default `data/`, `/data` in the
  container) with schema validation on read and an atomic write. Missing file means defaults.
- `library.ts` builds the streaming, network, studio and genre catalogue from Seerr and caches it for a day with
  `"use cache"`; featured network and studio ids are curated, everything else is live.
- `/views` fills the main content area with the library. `SidebarViews` enables editing in the
  actual sidebar on that route. `ViewEditor` receives the saved views from the authenticated layout
  and shares optimistic edits across the shell through `useOptimistic` and `viewEdits.ts`;
  library tiles hide saved sources and support dragging into a position or adding to the end.
  Dropping a sidebar card into the library removes it. Failed saves roll back and show an error.
  The streaming country filter uses Seerr's `/watchproviders/regions` list and the `country` URL
  parameter. Streaming tiles use square provider logos. Movies, TV and the selected genres use fixed TMDB backdrops in natural colour; other genre cards use Seerr's duotone palette. Add, remove and reorder
  are server actions in `actions.ts` that validate `FormData` with Effect `Schema` and revalidate
  the layout. Whole sidebar cards are draggable and have no navigation links while editing.
  Focused cards also support reordering with Alt + arrow keys.

## Settings

`features/settings` persists user preferences (`settings.json` in the data directory) through the
same `platform/jsonFile` helpers as views: a default original-language filter (URLs only name a
language when it differs; `lang=any` clears it) and whether the poster quick-info card opens on
hover or via an explicit ⓘ button. Preferences save on change from their own `/settings` page, reached through the user menu. Poster cards always show ⓘ as well as hover.

## Browse

A browse screen is `(view, list, filters, page)`:

- `filters.ts` parses grid filters from the URL (`type`, `genre`, `lang`, `rating`, `hide`, `year`, `sort`, `votes`).
- `browsePlan.ts` is pure: it maps a view, list and filters to the Seerr endpoints to page
  through. Unfiltered media views use Seerr's `trending` and `upcoming` endpoints; anything
  constrained falls back to TMDB discover approximations (popularity over the last year, future
  release dates). View-defined genres and languages stay fixed. Sort controls apply to a single media type; release-year and vote-count filters work across types.
- `loadBrowse.ts` fetches two Seerr pages per browse page, drops people from trending, resolves
  genre names, interleaves movie and series sources round-robin (TMDB popularity is not
  comparable across media types) and applies the hide-already-available filter locally.

## Titles

`features/title` owns the shared title model, cards and previews used by browse, search and
person pages, as well as `/title/[mediaType]/[id]`:

- `title.ts` maps Seerr results to the `Title` shown on cards; Seerr `MediaInfo.status` becomes
  `Availability`. Ratings with fewer than 10 votes are hidden.
- `TitleCard` is a client component: hovering for 350 ms, or pressing ⓘ, fetches
  `/api/titles/[mediaType]/[id]` (a `TitlePreview` validated with `Schema` on the client)
  and renders `TitleHoverCard` with request, details and watchlist actions. A preference on
  `/settings` can turn hover off so only the button opens it.
- `titleFacts.ts` fetches runtime and season count per title through `"use cache"` with the
  longest cache life, since list endpoints omit them; cards show them once known.
- `titleDetails.ts` maps Seerr's movie and series payloads plus Rotten Tomatoes / IMDb ratings
  into one `TitleDetails` model (scores, cast, seasons with availability, providers for the
  region, requests, downloads, external links).
- `requestTimeline.ts` derives the request → Radarr/Sonarr → Plex steps (including "Waiting for
  release", from digital/physical release dates or first-air dates) from media status, requests
  and download progress.
- `actions.ts` exposes `requestTitle` (film, whole series or one season) and `toggleWatchlist`
  as server actions used by `RequestButton` and `WatchlistButton` through `useActionState`.

## Rendering rules

- Pages read `params` and `searchParams`, validate them once (`parseDiscoverListId`,
  `parseBrowseFilters`, `parsePageNumber`, `parseTmdbId`), and pass typed values into a feature
  component.
- `platform/pageNumber.ts` owns both page-number entry points. `parsePageNumber` defaults invalid
  URL input to page one; `decodePageNumber` rejects invalid numeric input to server actions.
- Loaders call `connection()` before running Effect programs so the runtime's clock access is
  request-time rather than a prerender error. Request-time parts of the sidebar sit inside
  `Suspense` boundaries; `app/(authenticated)/loading.tsx` covers browsing pages.
- `AppShell.module.css` lives beside `app/(authenticated)/AppShell.tsx`. Shared results-footer
  styles belong to `features/feedback/InfiniteList.module.css`.
- Configuration is parsed once with Effect `Config` in `platform/configuration`. `/api/health`
  returns `503 misconfigured` until it parses, so the Docker health check reflects configuration.
- Use relative imports within a feature and `@/` when crossing into another area.

## Testing

- Unit tests cover the pure planning, filter parsing, mapping and timeline modules, view ids,
  and the client's request construction and error translation (with a stub `HttpClient`).
- Browser tests run against `tests/browser/fixtures/seerrServer.ts`, a small Node server that
  serves deterministic Seerr responses, records request and watchlist mutations at
  `/__fixture/requests`, and rejects API-key calls without an explicit user ID. The fixture also models Seerr sessions,
  CSRF protection and per-user watchlists. Browser tests sign in through the real login screen.
  Saved views use a fresh temporary data directory for each test run.
- Browser specs group tests by the behaviour they exercise. `title.spec.ts` covers title requests
  and previews, `filters.spec.ts` covers browse filters, and `search.spec.ts` covers search results.
  `settings.spec.ts` owns preference persistence and its effects on browsing. Its Playwright project
  runs after the other browser tests because preferences are instance-wide. Settings mutations run
  serially and restore defaults; view mutations remain in `views.spec.ts`.

## Search, people and continuous results

- The navbar search debounces suggestions through an authenticated server action; Enter opens
  `/search`. Movies, TV shows and people retain Seerr's result order. Search text uses percent
  encoding (including `%20` spaces) because Seerr rejects form-style `+` spaces.
- `features/person` owns `/person/[id]`, biography, personal information, known-for titles and
  combined movie/TV credits. Cast names link into these pages.
- `features/feedback/InfiniteList` appends unique results when its sentinel enters view, with a
  manual Load more / retry button. Browse, search and Requests load additional pages through
  authenticated server actions. Person credits, which Seerr returns in one response, reveal in
  batches. A refreshed server payload resets accumulated results so availability stays current.
- Shared content skeletons, empty/error panels and the authenticated error boundary provide
  recovery states. Later-page failures preserve the already loaded list.
- Request dialogs load quality profiles from Seerr's service endpoints for users with its advanced
  request permissions. The request action verifies the selection against those profiles again and
  submits only the matching server/profile/4K values. Omitted choices preserve Seerr's defaults.
  Requested profile names are read directly or resolved from service profiles when IDs are present.
