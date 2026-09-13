# Web source architecture

`apps/web` is a Next.js App Router application with Cache Components enabled. Group code by the
reason it changes:

| Area           | Owner                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| `app`          | Thin routes, layouts, route handlers and metadata. Pages parse URL input and delegate. |
| `features`     | Bounded user contexts: `browse` (lists and title grid) and `views` (sidebar).          |
| `integrations` | Reusable external-system mechanics: the Seerr client, schemas and image URLs.          |
| `platform`     | Application-wide behaviour such as configuration that is not one feature's concern.    |

## Seerr integration

`integrations/seerr` wraps Seerr's REST API (`/api/v1`) with `@effect/platform`'s `HttpClient`:

- `schemas.ts` declares Effect `Schema`s for the response bodies Disco reads. Decoding happens
  once, in the client; unknown fields are ignored so Seerr upgrades do not break parsing.
- `client.ts` is an `Effect.Service` (`SeerrClient`) that reads `seerrEnvironmentConfig`, adds the
  `X-Api-Key` header and translates failures into `SeerrUnavailable` (transport), `SeerrRejected`
  (non-2xx) and `SeerrMalformed` (schema) tagged errors.
- `runtime.ts` holds one `ManagedRuntime` per process. Loaders (`features/*/load*.ts`) run their
  Effect programs through it, log failures, and return plain discriminated results
  (`{ kind: "ok" } | { kind: "error" }`) that React can render.
- Posters and logos are TMDB paths; `images.ts` builds CDN URLs and `next/image` is used
  `unoptimized` so the browser loads them directly, as Seerr's own UI does.

## Browse

A browse screen is `(view, list, page)`:

- `features/views/views.ts` hard-codes the sidebar views: two media views (Movies, TV Shows) and
  two watch-provider views (Netflix, Disney+). Provider ids are TMDB watch-provider ids.
- `features/browse/browsePlan.ts` is pure: it maps a view and list to the Seerr endpoints to page
  through. Media views use Seerr's `trending` and `upcoming` endpoints; provider views cannot, so
  they approximate trending with popularity over the last year and upcoming with future dates.
- `loadBrowse.ts` fetches two Seerr pages per browse page, drops people from trending, resolves
  genre names, and interleaves movie and series sources round-robin (TMDB popularity is not
  comparable across media types).
- `title.ts` maps Seerr results to the `Title` shown on cards; Seerr `MediaInfo.status` becomes
  `Availability`. Ratings with fewer than 10 votes are hidden.
- Cards link to the title in Seerr until Disco has its own details screens.

## Rendering rules

- Pages read `params` and `searchParams`, validate them once (`findView`, `parseDiscoverListId`,
  `parsePageNumber`), and pass typed values into a feature component.
- Views are known at build time, so `/[viewId]` exports `generateStaticParams`; this also lets the
  sidebar's `usePathname` resolve during prerendering.
- Loaders call `connection()` before running Effect programs so the runtime's clock access is
  request-time rather than a prerender error. The sidebar loads inside a `Suspense` boundary in
  the root layout; `app/loading.tsx` covers pages.
- Configuration is parsed once with Effect `Config` in `platform/configuration`. `/api/health`
  returns `503 misconfigured` until it parses, so the Docker health check reflects configuration.
- Use relative imports within a feature and `@/` when crossing into another area.

## Testing

- Unit tests cover the pure planning and mapping modules and the client's request construction
  and error translation (with a stub `HttpClient`).
- Browser tests run against `tests/browser/fixtures/seerrServer.ts`, a small Node server that
  serves deterministic Seerr responses and rejects requests without the fixture API key.
