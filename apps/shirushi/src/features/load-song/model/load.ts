import { Effect, Option } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import { songAtom } from "#/entities/song";
import { fetchSong } from "#/shared/api";
import { runtime } from "#/shared/lib/runtime";

/** @internal */
export const linkAtom = Atom.make("").pipe(Atom.keepAlive);

/** @internal */
export const loadAtom = runtime.fn(
  Effect.fnUntraced(function* load(link: string) {
    const song = yield* fetchSong(link);
    const registry = yield* AtomRegistry.AtomRegistry;
    registry.set(songAtom, Option.some(song));
  }),
);
