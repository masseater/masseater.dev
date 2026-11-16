import { runtime } from "@masseater.dev/media-notes-ui";
import type { Judgement } from "@masseater.dev/shirushi-protocol";
import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { statementsAtom } from "#/entities/taste/index.ts";
import { judgeStatement } from "#/shared/api/index.ts";

export type Verdict = Readonly<{ id: string; judgement: Judgement }>;

/** @internal */
export const judgeAtom = runtime.fn(
  Effect.fnUntraced(function* judge({ id, judgement }: Verdict) {
    yield* judgeStatement(judgement)(id);
    const registry = yield* AtomRegistry.AtomRegistry;
    registry.refresh(statementsAtom);
  }),
);
