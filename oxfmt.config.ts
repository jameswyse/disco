import { formatConfig } from "@jameswyse/oxc-config/oxfmt";

export default {
  ...formatConfig,
  ignorePatterns: [...formatConfig.ignorePatterns, "**/.next-dev/**", "**/tests/results/**"],
};
