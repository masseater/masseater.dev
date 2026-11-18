import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { rank } from "./rank.ts";

const UNIT = 1;
const SQUARE = 2;
const QUERY = [UNIT, UNIT - UNIT];
const STRONG = 0.85;
const CLOSE = 0.8;
const WEAKER = 0.7;
const BELOW = 0.68;
const UNRELATED = 0.3;
const SAME = 0.9;
const LIMIT = 3;

const at = (score: number): readonly number[] => [score, Math.sqrt(UNIT - score ** SQUARE)];

const names = (ranked: readonly { readonly item: string }[]): readonly string[] =>
  pipe(
    ranked,
    Arr.map(({ item }) => item),
  );

describe("rank", () => {
  it("keeps close matches above the threshold, best first", () => {
    const ranked = rank(QUERY)([
      { item: "near", vector: at(CLOSE) },
      { item: "best", vector: at(STRONG) },
      { item: "far", vector: at(WEAKER) },
      { item: "unrelated", vector: at(UNRELATED) },
    ]);
    expect(names(ranked)).toStrictEqual(["best", "near"]);
  });

  it("suggests nothing when every match is weak", () => {
    const ranked = rank(QUERY)([
      { item: "weak", vector: at(BELOW) },
      { item: "weaker", vector: at(UNRELATED) },
    ]);
    expect(ranked).toStrictEqual([]);
  });

  it("caps the suggestions", () => {
    const ranked = rank(QUERY)(
      pipe(
        ["a", "b", "c", "d"],
        Arr.map((item) => ({ item, vector: at(SAME) })),
      ),
    );
    expect(ranked).toHaveLength(LIMIT);
  });
});
