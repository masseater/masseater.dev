import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { pageOf } from "./media.ts";

describe("pageOf", () => {
  it("names the canonical page of a link and none for a file", () => {
    expect(pageOf({ site: "youtube", id: "dQw4w9WgXcQ" })).toStrictEqual(
      Option.some("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    );
    expect(pageOf({ site: "soundcloud", id: "artist/track-name" })).toStrictEqual(
      Option.some("https://soundcloud.com/artist/track-name"),
    );
    expect(pageOf({ site: "file", id: "abc" })).toStrictEqual(Option.none());
  });
});
