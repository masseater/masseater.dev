import { Effect } from "effect";

import { correct } from "#/features/correct-transcript/index.ts";
import { research } from "#/features/research-leads/index.ts";
import type { runners } from "#/shared/lib/runners.ts";

type Assisting = Pick<Effect.Success<typeof runners>, "correcting" | "researching">;

/** @internal */
export const assistWith = ({ correcting, researching }: Assisting): Effect.Effect<void> =>
  Effect.sync(() => {
    correcting(correct(), { onlyIfMissing: true });
    researching(research(), { onlyIfMissing: true });
  });
