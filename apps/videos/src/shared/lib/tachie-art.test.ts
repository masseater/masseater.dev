import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { tachieArt } from "./tachie-art.ts";

const locate = (path: string): string => `/public/${path}`;

describe("tachieArt", () => {
  it("keeps a portrait entry as images", () => {
    expect(tachieArt({ entry: { closed: "cache/tachie/a.png" }, locate })).toStrictEqual({
      kind: "image",
      closed: "/public/cache/tachie/a.png",
      open: Option.none(),
    });
  });

  it("turns a PSD entry into a state, blinking and a mouth that follows the voice", () => {
    expect(
      tachieArt({
        entry: {
          psd: "cache/tachie/tsumugi.psd",
          favorites: "cache/tachie/tsumugi.pfv",
          state: "S.お気に入り/*表情~笑顔",
          blink: { closed: "v1.!目/*閉じ", open: "v1.!目/*開き" },
          mouth: { closed: "v1.!口/*ん", half: "v1.!口/*い", open: "v1.!口/*あ" },
        },
        locate,
      }),
    ).toStrictEqual({
      kind: "psd",
      psd: "/public/cache/tachie/tsumugi.psd",
      favorites: Option.some("/public/cache/tachie/tsumugi.pfv"),
      parts: [
        "S.お気に入り/*表情~笑顔",
        { kind: "blink", closed: "v1.!目/*閉じ", open: "v1.!目/*開き" },
        { kind: "volume-mouth", closed: "v1.!口/*ん", half: "v1.!口/*い", open: "v1.!口/*あ" },
      ],
    });
  });
});
