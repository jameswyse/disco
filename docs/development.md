# Development notes

The commands and pinned toolchain live in the root `package.json`.
[AGENTS.md](../AGENTS.md) contains the contribution rules.

## Verification

Run `pnpm verify` before finishing a code change. Use `pnpm verify:full` for changes to browser
behaviour or production builds. Install the browser once before running browser tests:

```sh
pnpm --filter @disco/web exec playwright install chromium
```

Browser tests build and run the production app against a local Seerr fixture. They do not use your
live Seerr instance. Each run uses a temporary data directory. Preferences are instance-wide, so
the settings test project runs after the other browser tests.

The `test:unit:changed` command selects changes since `HEAD`. Turborepo caches package tasks;
use `pnpm verify:uncached` when investigating a suspected cache problem.
Set `DISCO_HUMAN_OUTPUT=1` for verbose test and task output.

The pre-commit hook formats and lints staged files, then checks source types.

## Design decisions

Read the [web architecture notes](architecture/web.md) for ownership boundaries and the reasons
behind browsing and authentication behaviour.
