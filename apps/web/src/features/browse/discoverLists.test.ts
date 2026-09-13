import { describe, expect, it } from "vitest";

import { parseDiscoverListId } from "./discoverLists";

describe("parseDiscoverListId", () => {
  it("accepts a known list", () => {
    expect(parseDiscoverListId("popular")).toBe("popular");
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parseDiscoverListId(["upcoming", "popular"])).toBe("upcoming");
  });

  it("falls back to trending for missing or unknown values", () => {
    expect(parseDiscoverListId(undefined)).toBe("trending");
    expect(parseDiscoverListId("not-a-list")).toBe("trending");
    expect(parseDiscoverListId([])).toBe("trending");
  });

  it("does not treat inherited object properties as lists", () => {
    expect(parseDiscoverListId("toString")).toBe("trending");
  });
});
