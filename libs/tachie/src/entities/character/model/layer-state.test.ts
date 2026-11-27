import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option, pipe } from "effect";

import { CHARACTER_FAVORITES, characterRoundTrip } from "#/shared/lib/character.test.support.ts";

import { parseFavorites } from "./favorites.ts";
import { resolveVisibility } from "./layer-state.ts";
import { buildLayerTree } from "./layer-tree.ts";

const tree = buildLayerTree(characterRoundTrip());
const favorites = parseFavorites({ text: CHARACTER_FAVORITES, tree });

const shown = (state: string): Readonly<{ flip: string; paths: readonly string[] }> => {
  const { visible, flip } = resolveVisibility({ tree, favorites, state });
  const paths = pipe(
    tree.nodes,
    Arr.filter(({ index }) => visible[index] === true),
    Arr.map(({ path }) => path),
  );
  return { flip, paths };
};

const BODY = 1;
const DEFAULT = ["体", "影", "!目", "!目/*開き", "!口", "!口/*ん", "眉/飾り", "眉/*普通"];

describe("resolveVisibility layers", () => {
  it("keeps the file's own visibility when the state is empty", () => {
    expect(shown("")).toStrictEqual({ flip: "none", paths: DEFAULT });
  });

  it("shows a layer with its ancestors and drops its radio siblings", () => {
    expect(shown("v1.眉/*困り").paths).toStrictEqual([
      "体",
      "影",
      "!目",
      "!目/*開き",
      "!口",
      "!口/*ん",
      "眉",
      "眉/飾り",
      "眉/*困り",
    ]);
  });

  it("lets the later choice win inside a radio group", () => {
    expect(shown("v1.!口/*あ v1.!口/*い").paths).toContain("!口/*い");
    expect(shown("v1.!口/*あ v1.!口/*い").paths).not.toContain("!口/*あ");
  });

  it("never hides a forced layer", () => {
    expect(shown("v0.!目").paths).toStrictEqual(DEFAULT);
  });

  it("tells apart siblings that share a name", () => {
    expect(shown("v1.眉/飾り%5c1").paths).toContain("眉/飾り%5c1");
  });
});

describe("resolveVisibility favorites", () => {
  it("reads the parsed favorites", () => {
    expect(Option.isSome(favorites)).toBe(true);
  });

  it("replaces every layer with a favorite that has no filter", () => {
    expect(shown("F.お気に入り/困り顔").paths).toStrictEqual([
      "体",
      "!目",
      "!目/*半目",
      "!口",
      "!口/*ん",
      "眉",
      "眉/*困り",
    ]);
  });

  it("changes only the filtered layers with a filtered favorite", () => {
    expect(shown("F.お気に入り/*表情/目口/笑う").paths).toStrictEqual([
      "体",
      "影",
      "!目",
      "!目/*閉じ",
      "!口",
      "!口/*あ",
      "眉/飾り",
      "眉/*普通",
    ]);
  });

  it("picks a simple view item the same way as its favorite", () => {
    expect(shown("S.お気に入り/*表情/目口~笑う")).toStrictEqual(
      shown("F.お気に入り/*表情/目口/笑う"),
    );
  });

  it("swaps a layer for its mirror when the character flips", () => {
    expect(shown("L.1")).toStrictEqual({
      flip: "x",
      paths: ["体:flipx", ...Arr.drop(DEFAULT, BODY)],
    });
  });
});
