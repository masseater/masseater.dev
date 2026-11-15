import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { formatTime, watchUrl } from "./watch-url";

const START = 83;

describe("watchUrl", () => {
  it("niconico の ID は開始秒つきの視聴 URL にする", () => {
    expect(
      watchUrl({
        target: { videoId: "sm123", url: "https://example.com" },
        start: Option.some(START),
      }),
    ).toStrictEqual(Option.some("https://www.nicovideo.jp/watch/sm123?from=83"));
  });

  it("YouTube の ID は URL が YouTube のときだけ視聴 URL にする", () => {
    expect(
      watchUrl({
        target: { videoId: "abcdefghijk", url: "https://youtu.be/abcdefghijk" },
        start: Option.none(),
      }),
    ).toStrictEqual(Option.some("https://www.youtube.com/watch?v=abcdefghijk"));
  });

  it("未登録の URL は開けない", () => {
    expect(
      watchUrl({
        target: { videoId: "", url: "urn:medley-manager:unknown" },
        start: Option.none(),
      }),
    ).toStrictEqual(Option.none());
  });
});

describe("formatTime", () => {
  it("分と 2 桁の秒にする", () => {
    expect(formatTime(START)).toBe("1:23");
  });
});
