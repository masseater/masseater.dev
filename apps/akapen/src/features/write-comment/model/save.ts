import { anchorAtom, openedAtom, rangeAtom, runtime } from "@masseater.dev/media-notes-ui";
import { Effect, Option } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { commentsAtom } from "#/entities/comment";
import { postComment } from "#/shared/api";

import { wordsAtom } from "./draft.ts";

/** @internal */
export const saveAtom = runtime.fn(
  Effect.fnUntraced(function* save() {
    const registry = yield* AtomRegistry.AtomRegistry;
    const { media, location } = yield* Effect.fromOption(registry.get(openedAtom));
    const { from, to } = yield* Effect.fromOption(registry.get(rangeAtom));
    yield* postComment({ media, location, from, to, words: registry.get(wordsAtom) });
    yield* Effect.sync(() => {
      registry.set(rangeAtom, Option.none());
      registry.set(anchorAtom, Option.none());
      registry.set(wordsAtom, "");
      registry.refresh(commentsAtom);
    });
  }),
);
