import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { deleteMark } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/runtime.ts";

import { marksAtom } from "./marks.ts";

/** @internal */
export const removeAtom = runtime.fn(({ id, link }: Readonly<{ id: string; link: string }>) =>
  deleteMark(id).pipe(
    Effect.andThen(AtomRegistry.AtomRegistry),
    Effect.flatMap((registry) =>
      Effect.sync(() => {
        registry.refresh(marksAtom(link));
      }),
    ),
  ),
);
