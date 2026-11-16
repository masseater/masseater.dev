import { describe, expect, it } from "@effect/vitest";

import { clock, pageOf } from "./source.ts";

const MINUTE_AND_FIVE = 65.7;

describe("source", () => {
  it("formats a clock", () => {
    expect(clock(MINUTE_AND_FIVE)).toBe("1:05");
  });

  it("names the canonical page", () => {
    expect(pageOf({ site: "youtube", id: "dQw4w9WgXcQ" })).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(pageOf({ site: "soundcloud", id: "artist/track-name" })).toBe(
      "https://soundcloud.com/artist/track-name",
    );
  });
});
