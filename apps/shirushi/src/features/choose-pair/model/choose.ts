import { runtime } from "@masseater.dev/media-notes-ui";
import type { Choice } from "@masseater.dev/shirushi-protocol";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { pairsAtom } from "#/entities/taste/index.ts";
import { answerPair } from "#/shared/api/index.ts";

export type Answer = Readonly<{ id: string; choice: Choice }>;

/** @internal */
export const chooseAtom = runtime.fn(
  Effect.fnUntraced(function* choose({ id, choice }: Answer) {
    yield* answerPair(choice)(id);
    const registry = yield* AtomRegistry.AtomRegistry;
    registry.refresh(pairsAtom);
  }),
);
