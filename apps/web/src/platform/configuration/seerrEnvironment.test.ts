import { Either, Redacted } from "effect";
import { describe, expect, it } from "vitest";

import { readSeerrEnvironment } from "./seerrEnvironment";

describe("readSeerrEnvironment", () => {
  it("reads the Seerr origin and API key", () => {
    const environment = Either.getOrThrow(
      readSeerrEnvironment({
        SEERR_API_KEY: "secret-key",
        SEERR_URL: "https://request.example.test/",
      }),
    );

    expect(environment.origin.href).toBe("https://request.example.test/");
    expect(Redacted.value(environment.apiKey)).toBe("secret-key");
  });

  it("ignores unrelated variables and undefined values", () => {
    const environment = Either.getOrThrow(
      readSeerrEnvironment({
        OTHER: undefined,
        SEERR_API_KEY: "secret-key",
        SEERR_URL: "https://request.example.test",
        UNRELATED: "value",
      }),
    );

    expect(environment.origin.origin).toBe("https://request.example.test");
  });

  it("fails when the Seerr URL is missing", () => {
    expect(Either.isLeft(readSeerrEnvironment({ SEERR_API_KEY: "secret-key" }))).toBe(true);
  });

  it("fails when the API key is missing", () => {
    expect(Either.isLeft(readSeerrEnvironment({ SEERR_URL: "https://request.example.test" }))).toBe(
      true,
    );
  });

  it("fails when the Seerr URL is not a URL", () => {
    expect(
      Either.isLeft(readSeerrEnvironment({ SEERR_API_KEY: "secret-key", SEERR_URL: "not a url" })),
    ).toBe(true);
  });
});
