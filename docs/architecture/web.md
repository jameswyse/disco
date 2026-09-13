# Web source architecture

`apps/web` is a Next.js App Router application with Cache Components enabled. Group code by the
reason it changes:

| Area           | Owner                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| `app`          | Thin routes, layouts, route handlers and metadata. Pages parse URL input and delegate. |
| `features`     | Bounded user contexts: `browse`, `titleDetails`, `views`. Models, behaviour and views. |
| `integrations` | Reusable external-system mechanics, starting with the Seerr client (phase 2).          |
| `platform`     | Application-wide behaviour such as configuration that is not one feature's concern.    |

Rules that follow from this split:

- Pages read `params` and `searchParams`, validate them once (for example
  `parseDiscoverListId`), and pass typed values into a feature component.
- Configuration is parsed once with Effect `Config` in `platform/configuration`. Consumers receive
  the typed `SeerrEnvironment`; nothing else reads `process.env` for Seerr settings.
- `/api/health` returns `503 misconfigured` until the Seerr environment parses, so the Docker
  health check reflects configuration errors.
- Use relative imports within a feature and `@/` when crossing into another area.
- Cache Components streams a static shell first. `app/loading.tsx` provides the Suspense boundary
  for request-time pages; `notFound()` inside a streamed segment therefore renders the not-found
  screen with a `200` status.

## Placeholders

Phase 1 ships static placeholder data (`features/browse/placeholderTitles.ts`,
`features/views/sidebarViews.ts`) so the layout can be exercised and tested before the Seerr
integration exists. Replace these modules, not their consumers, when wiring Seerr.
