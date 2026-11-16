import { Effect, Option } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { marksAtom } from "#/entities/mark/index.ts";
import { songAtom } from "#/entities/song/index.ts";
import { postMark } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/runtime.ts";
import { pageOf } from "#source";

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
