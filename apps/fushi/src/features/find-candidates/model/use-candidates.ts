import { useAtomValue } from "@effect/atom-react";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { Atom } from "effect/reactivity";

import { libraryAtom, songsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { loadedOf, runtime } from "#/shared/lib/index.ts";
import type { Loaded } from "#/shared/lib/index.ts";

import { foundIn } from "./candidates.ts";
import type { FindFailure, Found } from "./candidates.ts";

const SEPARATOR = "\u0000";

const STYLE = 0;

const keyOf =
  (library: Library) =>
  (style: Style): string =>
    pipe(
      songsOf(library)(style.id),
      Arr.map((song) => song.id),
      Arr.prepend(style.baseline),
      Arr.prepend(style.id),
      Arr.join(SEPARATOR),
    );

const sourcesOf =
  (key: string) =>
  (library: Library): Effect.Effect<Found, FindFailure> =>
    pipe(
      Arr.get(Str.split(key, SEPARATOR), STYLE),
      Option.flatMap((id) => Arr.findFirst(library.styles, (style) => style.id === id)),
      Option.match({
        onNone: () => Effect.succeed<Found>({ baseline: "", list: [] }),
        onSome: (style) => foundIn({ baseline: style.baseline, songs: songsOf(library)(style.id) }),
      }),
    );

const candidatesAtom = Atom.family((key: string) =>
  runtime
    .atom((context) => context.resultOnce(libraryAtom).pipe(Effect.flatMap(sourcesOf(key))))
    .pipe(Atom.keepAlive),
);

export const useCandidates = ({
  library,
  style,
}: Readonly<{ library: Library; style: Style }>): Loaded<Found> => {
  const key = keyOf(library)(style);
  const result = useAtomValue(candidatesAtom(key));
  return loadedOf(result);
};
