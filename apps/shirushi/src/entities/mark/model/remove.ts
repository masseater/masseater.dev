import { runtime } from "@masseater.dev/media-notes-ui";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { deleteMark } from "#/shared/api";

import { marksAtom } from "./marks.ts";

/** @internal */
export const removeAtom = runtime.fn((id: string) =>
  deleteMark(id).pipe(
    Effect.andThen(AtomRegistry.AtomRegistry),
    Effect.flatMap((registry) =>
      Effect.sync(() => {
        registry.refresh(marksAtom);
      }),
    ),
  ),
);
