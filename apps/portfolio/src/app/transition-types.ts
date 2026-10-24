import { Array, Option, String as Str, pipe } from "effect";

import { categoryInfos, categoryPath } from "#/entities/entry";

const categoryPaths = pipe(
  categoryInfos,
  Array.map(({ category }) => categoryPath(category)),
);

const categoryIndex = (pathname: string): Option.Option<number> =>
  Array.findFirstIndex(
    categoryPaths,
    (path) => pathname === path || Str.startsWith(`${path}/`)(pathname),
  );

const direction = (from: number, to: number): string => {
  if (to > from) {
    return "forward";
  }
  if (to < from) {
    return "backward";
  }
  return "drift";
};

const fromIndex = (
  location: Readonly<{ pathname: string }> | null | undefined,
): Option.Option<number> =>
  Option.flatMap(Option.fromNullishOr(location), ({ pathname }) => categoryIndex(pathname));

const transitionTypes = ({
  fromLocation,
  toLocation,
}: Readonly<{
  fromLocation?: Readonly<{ pathname: string }>;
  toLocation: Readonly<{ pathname: string }>;
}>): string[] =>
  Option.match(Option.all([fromIndex(fromLocation), categoryIndex(toLocation.pathname)]), {
    onNone: () => ["drift"],
    onSome: ([from, to]) => [direction(from, to)],
  });

export { transitionTypes };
