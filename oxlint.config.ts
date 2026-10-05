import { createLintConfig } from "@jameswyse/oxc-config/oxlint";

const base = createLintConfig({
  root: import.meta.dirname,
  nextjs: ["apps/web"],
  node: ["apps/web/src/platform/**/*.ts", "apps/web/src/integrations/**/*.ts", "deploy/**/*.mjs"],
  vitest: ["**/*.test.{ts,tsx}"],
  tests: ["apps/web/tests/**/*.ts"],
  effect: ["apps/web/**/*.ts", "tools/vitest/**/*.ts"],
  env: ["apps/web/src/platform/configuration/seerrEnvironment.ts", "deploy/healthcheck.mjs"],
  boundaries: [
    {
      files: ["apps/web/src/features/**/*.tsx"],
      deny: [
        "node:*",
        "node:*/**",
        "effect",
        "effect/**",
        "@/platform/{runtime,jsonFile}{,.ts}",
        "apps/web/src/platform/{runtime,jsonFile}{,.ts}",
        "@/platform/{auth,configuration}/**",
        "apps/web/src/platform/{auth,configuration}/**",
        "@/integrations/seerr/{auth,client}{,.ts}",
        "apps/web/src/integrations/seerr/{auth,client}{,.ts}",
        "@/integrations/plex/library{,.ts}",
        "apps/web/src/integrations/plex/library{,.ts}",
      ],
      message: "Feature components receive plain data through loaders and server actions.",
    },
    {
      files: ["apps/web/src/integrations/**"],
      deny: ["@/features/**", "apps/web/src/features/**", "@/app/**", "apps/web/src/app/**"],
      message:
        "Integrations expose external services to features without importing routes or features.",
    },
    {
      files: ["apps/web/src/platform/configuration/**"],
      deny: [
        "@/features/**",
        "apps/web/src/features/**",
        "@/integrations/**",
        "apps/web/src/integrations/**",
      ],
      message: "Configuration supplies typed settings to integrations and features.",
    },
  ],
  clock: [
    "apps/web/src/integrations/plex/signIn.ts",
    "apps/web/src/features/browse/loadBrowse.ts",
    "apps/web/src/features/requests/loadRequests.ts",
    "apps/web/src/features/title/loadTitleDetails.ts",
    "apps/web/src/features/title/titleFacts.ts",
  ],
});

export default {
  ...base,
  ignorePatterns: [...base.ignorePatterns, "**/.next-dev/**", "**/tests/results/**"],
  settings: {
    ...base.settings,
    react: { version: "19.3.0" },
  },
};
