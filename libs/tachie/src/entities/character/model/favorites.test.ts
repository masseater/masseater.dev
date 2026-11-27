import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option, pipe } from "effect";

import { CHARACTER_FAVORITES, characterRoundTrip } from "#/shared/lib/character.test.support.ts";

import { parseFavorites } from "./favorites.ts";
import type { FaviewNode, FavoriteNode } from "./favorites.ts";
import { buildLayerTree } from "./layer-tree.ts";

const tree = buildLayerTree(characterRoundTrip());

interface Outline {
  readonly name: string;
  readonly children: readonly Outline[];
}

const outlineOf = (node: FavoriteNode | FaviewNode): Outline => ({
  name: node.name,
  children: pipe(node.children, Arr.map(outlineOf)),
});

describe("parseFavorites", () => {
  it("builds the favorite tree under the root name", () => {
    expect(
      pipe(
        parseFavorites({ text: CHARACTER_FAVORITES, tree }),
        Option.map(({ root }) => outlineOf(root)),
      ),
    ).toStrictEqual(
      Option.some({
        name: "お気に入り",
        children: [
          {
            name: "*表情",
            children: [
              {
                name: "目口",
                children: [
                  { name: "笑う", children: [] },
                  { name: "普通", children: [] },
                ],
              },
            ],
          },
          { name: "困り顔", children: [] },
        ],
      }),
    );
  });

  it("collects the simple view from folders whose names start with a star", () => {
    expect(
      pipe(
        parseFavorites({ text: CHARACTER_FAVORITES, tree }),
        Option.flatMap(({ faview }) => Arr.head(faview.children)),
        Option.flatMap(({ children }) => Arr.head(children)),
        Option.map(({ name, items }) => ({
          name,
          items: pipe(
            items,
            Arr.map((item) => item.name),
          ),
        })),
      ),
    ).toStrictEqual(Option.some({ name: "目口", items: ["笑う", "普通"] }));
  });

  it("rejects text without the PSDTool header", () => {
    expect(parseFavorites({ text: "//困り顔\n体", tree })).toStrictEqual(Option.none());
  });
});
