# Disco

Media discovery for a [Seerr](https://github.com/seerr-team/seerr) instance. Seerr keeps the
content catalogue, metadata and the request → Radarr/Sonarr → Plex pipeline; Disco provides a
simpler, user-controlled browsing UI on top of it.

Phase 1 delivers the repository foundations and a static UI shell. The Seerr integration follows.

## Quick start

The repository pins its Node.js and pnpm toolchain in `package.json` (`devEngines` and
`packageManager`). Any pnpm ≥ 10 switches to the pinned version automatically.

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
pnpm dev
```

Set `SEERR_URL` and `SEERR_API_KEY` in `apps/web/.env` (Seerr → Settings → General → API Key). The
UI renders without them; `/api/health` reports `misconfigured` until both parse.

| Local service | URL                     | Command    |
| ------------- | ----------------------- | ---------- |
| Web app       | <http://localhost:3000> | `pnpm dev` |

Install Chromium once before running browser tests:

```sh
pnpm --filter @disco/web exec playwright install chromium
```

## Repository map

| Package      | Path       | Responsibility                        |
| ------------ | ---------- | ------------------------------------- |
| `@disco/web` | `apps/web` | Next.js application and browser tests |

Shared developer tooling lives in `tools/` (Oxlint plugin, Vitest reporters), repository scripts in
`scripts/`, container files in `deploy/` and architecture notes in `docs/`. Add packages under
`packages/` only when more than one real consumer needs a stable interface.

## Commands

Run these from the repository root. Package tasks run through Turborepo and are cached.

| Command                | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `pnpm dev`             | Start the web app on port 3000                                       |
| `pnpm check`           | Format check, lint and source type check                             |
| `pnpm fix`             | Format and auto-fix lint findings                                    |
| `pnpm typecheck`       | Generate Next.js route types and type check with TypeScript 7        |
| `pnpm test:unit`       | Vitest unit tests (`test:unit:changed` for files changed since HEAD) |
| `pnpm test:e2e`        | Build, then run Playwright against `next start`                      |
| `pnpm build`           | Production build with standalone output                              |
| `pnpm verify`          | Everything above except browser tests; the standard final gate       |
| `pnpm verify:full`     | `verify` plus browser tests                                          |
| `pnpm verify:uncached` | `verify` with Turborepo caching disabled                             |
| `pnpm clean`           | Remove build outputs and caches                                      |

Set `DISCO_HUMAN_OUTPUT=1` for verbose, human-oriented test and Turborepo output.

A Husky pre-commit hook formats and lints staged files and runs the source type check.

## Docker

The image builds from `deploy/Dockerfile` (multi-stage: prune → install → build → slim runner
with only the standalone Next.js output). `compose.yaml` runs it.

```sh
cp .env.example .env   # set SEERR_URL and SEERR_API_KEY
docker compose up --build --detach
```

The container listens on port 3000 (published on `DISCO_PORT`, default 3000) and reports health at
`/api/health`. `docker compose ps` shows `healthy` once Seerr settings parse.

To build and run without Compose:

```sh
docker build --file deploy/Dockerfile --tag disco:local .
docker run --detach --publish 3000:3000 \
  --env SEERR_URL=https://request.example.com \
  --env SEERR_API_KEY=your-key \
  disco:local
```

## Toolchain

- Turborepo monorepo, pnpm workspaces with a version catalog
- Next.js 16 (App Router, Cache Components, Turbopack, React Compiler) and React 19
- Effect for configuration and, later, the Seerr client
- TypeScript 7 for type checking (`@typescript/native`); TypeScript 6 remains installed for tooling
  that still needs the JavaScript compiler API
- Oxlint (type-aware, with a local `anti-slop` plugin) and Oxfmt
- Vitest for unit tests, Playwright for browser tests
- CSS modules with design tokens; no CSS framework

See [AGENTS.md](AGENTS.md) for the rules that apply to every change and
[docs/architecture/web.md](docs/architecture/web.md) for source layout.
