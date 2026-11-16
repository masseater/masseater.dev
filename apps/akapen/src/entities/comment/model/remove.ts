import type { Comment } from "@masseater.dev/akapen-protocol";
import { runtime } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import { deleteComment, restoreComment } from "#/shared/api/index.ts";

import { commentsAtom } from "./comments.ts";

/** @internal */
export const removedAtom = Atom.make<readonly Comment[]>(Arr.empty()).pipe(Atom.keepAlive);

/** @internal */
export const removeAtom = runtime.fn((comment: Comment) =>
  deleteComment(comment.id).pipe(
    Effect.andThen(AtomRegistry.AtomRegistry),
    Effect.flatMap((registry) =>
      Effect.sync(() => {
        registry.update(removedAtom, Arr.append(comment));
        registry.refresh(commentsAtom);
      }),
    ),
  ),
);

const LAST = 1;

const putBack = (comment: Comment): Effect.Effect<void, ApiFailed, AtomRegistry.AtomRegistry> =>
  Effect.gen(function* restoring() {
    const registry = yield* AtomRegistry.AtomRegistry;
    yield* restoreComment(comment);
    registry.update(removedAtom, Arr.dropRight(LAST));
    registry.refresh(commentsAtom);
  });

/** @internal */
export const undoAtom = runtime.fn(() =>
  AtomRegistry.AtomRegistry.pipe(
    Effect.flatMap((registry) =>
      pipe(
        registry.get(removedAtom),
        Arr.last,
        Option.match({
          onNone: () => Effect.void,
          onSome: putBack,
        }),
      ),
    ),
  ),
);
