import { Array as Arr, Option, String as Str, pipe } from "effect";

import { decodeLayerName } from "#/shared/lib/layer-name.ts";

import type { FavoriteState, Favorites } from "./favorites.ts";

const SKIP = 1;

interface Named<Node> {
  readonly name: string;
  readonly children: readonly Node[];
}

const walk = <Node extends Named<Node>>(root: Node, path: string): Option.Option<Node> => {
  const names = Option.all(pipe(Str.split("/")(path), Arr.map(decodeLayerName)));
  const below = pipe(
    names,
    Option.filter((decoded) => Option.contains(Arr.head(decoded), root.name)),
    Option.map((decoded) => Arr.drop(decoded, SKIP)),
  );
  return pipe(
    below,
    Option.flatMap((rest) => {
      let found = Option.some(root);
      for (const name of rest) {
        found = pipe(
          found,
          Option.flatMap(({ children }) => Arr.findFirst(children, (child) => child.name === name)),
        );
      }
      return found;
    }),
  );
};

export const findFavorite = ({
  favorites,
  path,
}: Readonly<{ favorites: Favorites; path: string }>): Option.Option<FavoriteState> =>
  pipe(
    walk(favorites.root, path),
    Option.flatMap(({ item }) => item),
  );

export const findFaviewItem = ({
  favorites,
  path,
  item,
}: Readonly<{ favorites: Favorites; path: string; item: string }>): Option.Option<FavoriteState> =>
  pipe(
    Option.all({ node: walk(favorites.faview, path), name: decodeLayerName(item) }),
    Option.flatMap(({ node, name }) => Arr.findFirst(node.items, (found) => found.name === name)),
    Option.map(({ state }) => state),
  );
