# Development notes

Commands and toolchain versions live in [package.json](../package.json).
Follow [AGENTS.md](../AGENTS.md) and the [web architecture rules](architecture/web.md).

Use `pnpm exec` for tools outside package scripts so they use the project runtime.
After changing `devEngines`, run `pnpm install` and commit the updated lockfile.

New worktrees copy ignored environment files from the main worktree and install dependencies.
`git worktree add --no-checkout` skips this setup; later branch switches do not repeat it.

## Verification

Install Chromium once before running browser tests:

```sh
pnpm --filter @disco/web exec playwright install chromium
```

Browser tests use a local Seerr fixture, never the live instance. Preferences and views are
instance-wide, so tests that mutate them must avoid concurrent readers.

Verification runs serially because Next.js builds can delete `.next/types` while lint and type
checks read them. Set `DISCO_HUMAN_OUTPUT=1` for verbose task output.

## Lint decisions

The shared server-action guard rule requires an awaited guard as the first statement. Disco's
`runAuthenticated`, shared action helpers, and unauthenticated sign-in actions do not fit that rule.
