# Disco agent rules

Disco owns browsing. Seerr owns metadata, users, and requests through Radarr/Sonarr to Plex.

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

## Finish code tasks

1. Iterate on changed files with package-scoped fixes and checks (`pnpm fix`, `pnpm check`,
   `pnpm test:unit:changed`, `pnpm test:e2e:changed`).
2. Use the `code-review` skill if available. Fix every finding and repeat until clean.
3. After parallel work and test processes stop, run `pnpm verify` after each completed code change.
   Run `pnpm verify:full` when the change affects production builds or browser behaviour, and
   `pnpm verify:uncached` to rule out a suspected cache problem.

Use conventional commit messages. Use semantic versions and Git tags for releases.

Turborepo and Next.js write managed agent guidance blocks into `AGENTS.md` (Turborepo in the root,
Next.js in `apps/web`). Keep and commit their changes to those blocks.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
