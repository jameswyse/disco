import { describe, expect, it } from "vitest";

import { parsePageNumber } from "./pageNumber";

describe("parsePageNumber", () => {
  it("accepts positive integers", () => {
    expect(parsePageNumber("3")).toBe(3);
    expect(parsePageNumber(["2", "9"])).toBe(2);
  });

  it("falls back to the first page for anything else", () => {
    expect(parsePageNumber(undefined)).toBe(1);
    expect(parsePageNumber("0")).toBe(1);
    expect(parsePageNumber("-4")).toBe(1);
    expect(parsePageNumber("2.5")).toBe(1);
    expect(parsePageNumber("abc")).toBe(1);
  });
});
