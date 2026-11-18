import { Effect } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { jobsAtom } from "#/entities/job/index.ts";
import { analyzeSong } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/index.ts";

/** @internal */
export const analyzeAtom = runtime.fn(
  Effect.fnUntraced(function* analyze(songId: string) {
    yield* analyzeSong(songId);
    const registry = yield* AtomRegistry.AtomRegistry;
    registry.refresh(jobsAtom);
  }),
);
