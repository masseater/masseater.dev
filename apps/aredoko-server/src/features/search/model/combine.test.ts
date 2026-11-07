import { describe, expect, it } from "@effect/vitest";
import { Array, Option, pipe } from "effect";

import { combine } from "./combine.ts";

const PICTURED = 1;
const NAMED_LIKE = 2;
const NAMED = 3;

const topOf = (ranked: ReturnType<typeof combine>): Option.Option<number> =>
  pipe(
    Array.head(ranked),
    Option.map(([id]) => id),
  );

describe("combine", () => {
  it("keeps a strong image match above a text list that only matched the asset kind", () => {
    const ranked = combine({
      images: [{ id: PICTURED, similarity: 0.72 }],
      texts: [{ id: NAMED_LIKE, similarity: 0.65 }],
      names: [],
    });
    expect(topOf(ranked)).toStrictEqual(Option.some(PICTURED));
  });

  it("uses the best of several images of one asset", () => {
    const ranked = combine({
      images: [
        { id: PICTURED, similarity: 0.5 },
        { id: NAMED_LIKE, similarity: 0.6 },
        { id: PICTURED, similarity: 0.7 },
      ],
      texts: [],
      names: [],
    });
    expect(topOf(ranked)).toStrictEqual(Option.some(PICTURED));
  });

  it("lifts an asset whose name contains the query", () => {
    const ranked = combine({
      images: [],
      texts: [
        { id: NAMED_LIKE, similarity: 0.7 },
        { id: NAMED, similarity: 0.68 },
      ],
      names: [NAMED],
    });
    expect(topOf(ranked)).toStrictEqual(Option.some(NAMED));
  });
});
