import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [".next", ".next-dev", "coverage", "dist", "tests/results"],
  sortImports: {
    internalPattern: ["@/", "#"],
    groups: [
      "value-builtin",
      "next-libs",
      "react-libs",
      "value-external",
      "value-internal",
      ["value-parent", "value-sibling", "value-index"],
      "type-builtin",
      "type-external",
      "type-internal",
      ["type-parent", "type-sibling", "type-index"],
      "unknown",
      "style",
    ],
    customGroups: [
      {
        groupName: "next-libs",
        elementNamePattern: ["next", "next/*"],
        modifiers: ["value"],
        selector: "external",
      },
      {
        groupName: "react-libs",
        elementNamePattern: ["react", "react-dom", "react-router*"],
        modifiers: ["value"],
        selector: "external",
      },
    ],
  },
  sortPackageJson: { sortScripts: true },
});
