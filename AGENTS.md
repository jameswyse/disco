# Disco agent rules

Disco is a media-discovery web app layered over an existing Seerr instance. Seerr owns content
metadata, the request pipeline (Radarr/Sonarr → Plex) and users; Disco owns a simpler,
user-controlled browsing UI.

## Every code change

- Prefer simple, strictly typed code that makes invalid states unrepresentable. Never use `any`.
- Validate untrusted or untyped data once at its system boundary (environment variables, Seerr
  responses, URL parameters), then trust the resulting typed model. Do not repeat shape checks or
  guard against states excluded by established types.
- Do not add speculative guards, fallbacks, compatibility branches, automatic retries, custom rate
  limiting or defensive state machines unless required by current behaviour or a reachable external
  failure.
- Model effects, configuration and external calls with Effect. Keep Effect programs at module
  boundaries; React components receive plain data.
- Style with standard CSS through CSS modules and the design tokens in `apps/web/src/app/globals.css`.
  Do not add a CSS framework or CSS-in-JS.
- Keep the Seerr API key server-only. Never expose it through `NEXT_PUBLIC_` variables, client
  components, logs or fixtures.

## Read before editing

- `apps/web/src`: read [docs/architecture/web.md](docs/architecture/web.md) for directory ownership.
- Tests: before writing or changing one, state the observable behaviour, proposed seam and
  authoritative source. Test through a caller's interface with an independent expected result.
- The approved UI mockups live outside the repository in
  `/Users/james/Projects/Personal/media-discovery-mockups/` (`05-seerr-browse.html`,
  `06-seerr-details.html`, `07-seerr-views.html`). Match them before inventing new layouts.

## Finish code tasks

1. Iterate on changed files with package-scoped fixes and checks (`pnpm fix`, `pnpm check`,
   `pnpm test:unit:changed`, `pnpm test:e2e:changed`).
2. Use the `code-review` skill if available. Fix every finding and repeat until clean.
3. After parallel work and test processes stop, run `pnpm verify` after each completed code change.
   Run `pnpm verify:full` when the change affects production builds or browser behaviour, and
   `pnpm verify:uncached` to rule out a suspected cache problem.

Use conventional commit messages. Use semantic versions and Git tags for releases.

Next.js may create or update local `AGENTS.md` files under `apps/web`. Keep and commit those changes.
