import { Effect, Option } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { marksAtom } from "#/entities/mark";
import { songAtom } from "#/entities/song";
import { postMark } from "#/shared/api";
import { runtime } from "#/shared/lib/runtime";
import { pageOf } from "#/shared/lib/source";

import { anchorAtom, aspectsAtom, rangeAtom, verbAtom, wordsAtom } from "./draft.ts";

/** @internal */
export const saveAtom = runtime.fn(
  Effect.fnUntraced(function* save() {
    const registry = yield* AtomRegistry.AtomRegistry;
    const song = yield* Effect.fromOption(registry.get(songAtom));
    const link = pageOf(song.source);
    const { from, to } = yield* Effect.fromOption(registry.get(rangeAtom));
    yield* postMark({
      song,
      from,
      to,
      verb: registry.get(verbAtom),
      aspects: registry.get(aspectsAtom),
      words: registry.get(wordsAtom),
    });
    yield* Effect.sync(() => {
      registry.set(rangeAtom, Option.none());
      registry.set(anchorAtom, Option.none());
      registry.set(aspectsAtom, []);
      registry.set(wordsAtom, "");
      registry.refresh(marksAtom(link));
    });
  }),
);
