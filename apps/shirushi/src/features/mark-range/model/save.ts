import { runtime, savedRange } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { marksAtom } from "#/entities/mark";
import { postMark } from "#/shared/api";

import { aspectsAtom, verbAtom, wordsAtom } from "./draft.ts";

const EMPTY = "";

/** @internal */
export const saveAtom = runtime.fn(
  Effect.fnUntraced(function* save() {
    const drafted = yield* AtomRegistry.AtomRegistry;
    const verb = drafted.get(verbAtom);
    const aspects = drafted.get(aspectsAtom);
    const words = drafted.get(wordsAtom);
    const registry = yield* savedRange(({ media }, { from, to }) =>
      postMark({ song: media, from, to, verb, aspects, words }),
    );
    registry.set(aspectsAtom, Arr.empty());
    registry.set(wordsAtom, EMPTY);
    registry.refresh(marksAtom);
  }),
);
