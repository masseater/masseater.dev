import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option, pipe } from "effect";

import { characterRoundTrip } from "#/shared/lib/character.test.support.ts";

import { buildLayerTree } from "./layer-tree.ts";

const tree = buildLayerTree(characterRoundTrip());

const pathsOf = (indices: readonly number[]): readonly string[] =>
  pipe(
    indices,
    Arr.flatMap((index) => Option.toArray(pipe(tree.nodes, Arr.get(index)))),
    Arr.map(({ path }) => path),
  );

const parentOf = (path: string): Option.Option<readonly string[]> =>
  pipe(
    Option.fromNullishOr(tree.byPath.get(path)),
    Option.flatMap((index) => pipe(tree.nodes, Arr.get(index))),
    Option.flatMap(({ parent }) => parent),
    Option.map((parent) => pathsOf([parent])),
  );

describe("buildLayerTree paths", () => {
  it("names each layer by its encoded path, bottom layer first", () => {
    const indices = pipe(
      tree.nodes,
      Arr.map(({ index }) => index),
    );
    expect(pathsOf(indices)).toStrictEqual([
      "体",
      "体:flipx",
      "影",
      "!目",
      "!目/*閉じ",
      "!目/*半目",
      "!目/*開き",
      "!口",
      "!口/*ん",
      "!口/*あ",
      "!口/*い",
      "!口/*う",
      "!口/*え",
      "!口/*お",
      "眉",
      "眉/飾り",
      "眉/飾り%5c1",
      "眉/*普通",
      "眉/*困り",
    ]);
  });

  it("keeps the parent of every nested layer", () => {
    expect(parentOf("!目/*開き")).toStrictEqual(Option.some(["!目"]));
  });
});

describe("buildLayerTree markers", () => {
  it("groups the starred siblings of each folder into one choice", () => {
    expect(pipe(tree.radios, Arr.map(pathsOf))).toStrictEqual([
      ["!目/*閉じ", "!目/*半目", "!目/*開き"],
      ["!口/*ん", "!口/*あ", "!口/*い", "!口/*う", "!口/*え", "!口/*お"],
      ["眉/*普通", "眉/*困り"],
    ]);
  });

  it("forces the folders whose names start with an exclamation mark", () => {
    expect(pathsOf(tree.forced)).toStrictEqual(["!目", "!口"]);
  });

  it("pairs a flip layer with its sibling of the same base name", () => {
    expect(
      pipe(
        tree.flips,
        Arr.map(({ kinds, original, mirror }) => ({
          kinds,
          paths: pathsOf([original, mirror]),
        })),
      ),
    ).toStrictEqual([{ kinds: ["x"], paths: ["体", "体:flipx"] }]);
  });
});
