import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { clock, linkAt, pageOf, sourceOf } from "./source.ts";

const YOUTUBE = { site: "youtube", id: "dQw4w9WgXcQ" } as const;
const NICONICO = { site: "niconico", id: "sm9" } as const;
const SOUNDCLOUD = { site: "soundcloud", id: "artist/track-name" } as const;
const MINUTE_AND_FIVE = 65.7;

describe("sourceOf", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30", YOUTUBE],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", YOUTUBE],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", YOUTUBE],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", YOUTUBE],
    ["https://www.nicovideo.jp/watch/sm9", NICONICO],
    ["https://sp.nicovideo.jp/watch/sm9", NICONICO],
    ["https://nico.ms/sm9", NICONICO],
    ["  https://soundcloud.com/artist/track-name?in=x  ", SOUNDCLOUD],
  ])("reads %s", (text, expected) => {
    expect(sourceOf(text)).toStrictEqual(Option.some(expected));
  });

  it.each([
    "not a url",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://soundcloud.com/artist",
    "https://www.nicovideo.jp/watch/lv123",
  ])("rejects %s", (text) => {
    expect(sourceOf(text)).toStrictEqual(Option.none());
  });
});

describe("links", () => {
  it("formats a clock", () => {
    expect(clock(MINUTE_AND_FIVE)).toBe("1:05");
  });

  it("links to the start of a range", () => {
    expect(linkAt({ source: YOUTUBE, seconds: MINUTE_AND_FIVE })).toBe(
      "https://youtu.be/dQw4w9WgXcQ?t=65",
    );
    expect(linkAt({ source: NICONICO, seconds: MINUTE_AND_FIVE })).toBe(
      "https://www.nicovideo.jp/watch/sm9?from=65",
    );
    expect(linkAt({ source: SOUNDCLOUD, seconds: MINUTE_AND_FIVE })).toBe(
      "https://soundcloud.com/artist/track-name#t=1:05",
    );
  });

  it("names the canonical page", () => {
    expect(pageOf(YOUTUBE)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
