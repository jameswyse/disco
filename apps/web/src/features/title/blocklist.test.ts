import { describe, expect, it } from "vitest";

import { canManageBlocklist } from "./blocklist";

describe("Seerr blocklist permissions", () => {
  it.each([
    { permissions: 2, expected: true },
    { permissions: 268435456, expected: true },
    { permissions: 1073741824, expected: false },
    { permissions: 8192, expected: false },
    { permissions: undefined, expected: false },
  ])("permits management for $permissions: $expected", ({ permissions, expected }) => {
    expect(canManageBlocklist(permissions)).toBe(expected);
  });
});
