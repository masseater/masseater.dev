import { Effect, Option } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import { songAtom } from "#/entities/song/index.ts";
import { fetchSong } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/runtime.ts";
import { pageOf, sourceOf } from "#source";

/** @internal */
export const linkAtom = Atom.make("").pipe(Atom.keepAlive);

/** @internal */
export const loadAtom = runtime.fn(
  Effect.fnUntraced(function* load(link: string) {
    const source = yield* Effect.fromOption(sourceOf(link));
    const song = yield* fetchSong(pageOf(source));
    const registry = yield* AtomRegistry.AtomRegistry;
    registry.set(songAtom, Option.some(song));
  }),
);
