import { runtime, savedRange } from "@masseater.dev/media-notes-ui";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { commentsAtom } from "#/entities/comment";
import { postComment } from "#/shared/api";

import { wordsAtom } from "./draft.ts";

const EMPTY = "";

/** @internal */
export const saveAtom = runtime.fn(
  Effect.fnUntraced(function* save() {
    const words = (yield* AtomRegistry.AtomRegistry).get(wordsAtom);
    const registry = yield* savedRange(({ media, location }, { from, to }) =>
      postComment({ media, location, from, to, words }),
    );
    registry.set(wordsAtom, EMPTY);
    registry.refresh(commentsAtom);
  }),
);
