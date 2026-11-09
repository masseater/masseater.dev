import { Array, Option, String as Str, pipe } from "effect";

import { sectionPath, sections } from "#/shared/config";

const sectionPaths = pipe(sections, Array.map(sectionPath));

const sectionIndex = (pathname: string): Option.Option<number> =>
  Array.findFirstIndex(
    sectionPaths,
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
  Option.flatMap(Option.fromNullishOr(location), ({ pathname }) => sectionIndex(pathname));

const transitionTypes = ({
  fromLocation,
  toLocation,
}: Readonly<{
  fromLocation?: Readonly<{ pathname: string }>;
  toLocation: Readonly<{ pathname: string }>;
}>): string[] =>
  Option.match(Option.all([fromIndex(fromLocation), sectionIndex(toLocation.pathname)]), {
    onNone: () => ["drift"],
    onSome: ([from, to]) => [direction(from, to)],
  });

export { transitionTypes };
