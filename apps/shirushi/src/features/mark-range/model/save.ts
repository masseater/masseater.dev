import { anchorAtom, openedAtom, rangeAtom, runtime } from "@masseater.dev/media-notes-ui";
import { Effect, Option } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { marksAtom } from "#/entities/mark";
import { postMark } from "#/shared/api";

import { aspectsAtom, verbAtom, wordsAtom } from "./draft.ts";

/** @internal */
export const saveAtom = runtime.fn(
  Effect.fnUntraced(function* save() {
    const registry = yield* AtomRegistry.AtomRegistry;
    const { media } = yield* Effect.fromOption(registry.get(openedAtom));
    const { from, to } = yield* Effect.fromOption(registry.get(rangeAtom));
    yield* postMark({
      song: media,
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
      registry.refresh(marksAtom);
    });
  }),
);
