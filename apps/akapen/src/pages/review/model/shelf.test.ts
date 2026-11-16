import { describe, expect, it } from "@effect/vitest";
import type { Comment } from "@masseater.dev/akapen-protocol";
import { Array as Arr, Option, pipe } from "effect";

import { shelvesOf } from "./shelf.ts";

const OPEN = Option.getOrNull(Option.none<Comment["resolution"] & object>());
const FIRST = 10;
const SECOND = 20;
const THIRD = 30;
const TWICE = 2;
const ONCE = 1;

const comment = (id: string, video: string, at: number): Comment => ({
  id,
  media: { source: { site: "file", id: video }, title: `${video}.mp4`, artist: "" },
  location: `/videos/${video}.mp4`,
  from: 1,
  to: 2,
  words: "",
  at,
  resolution: OPEN,
});

describe("shelvesOf", () => {
  it("groups comments per video, newest video first", () => {
    const shelves = shelvesOf([
      comment("3", "v11", THIRD),
      comment("2", "v10", SECOND),
      comment("1", "v11", FIRST),
    ]);
    expect(
      pipe(
        shelves,
        Arr.map(({ latest, count }) => [latest.media.title, count]),
      ),
    ).toStrictEqual([
      ["v11.mp4", TWICE],
      ["v10.mp4", ONCE],
    ]);
  });
});
