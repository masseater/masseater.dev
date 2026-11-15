import { Effect } from "effect";

import { correct } from "#/features/correct-transcript";
import { research } from "#/features/research-leads";
import type { runners } from "#/shared/lib/runners";

type Assisting = Pick<Effect.Success<typeof runners>, "correcting" | "researching">;

/** @internal */
export const assistWith = ({ correcting, researching }: Assisting): Effect.Effect<void> =>
  Effect.sync(() => {
    correcting(correct(), { onlyIfMissing: true });
    researching(research(), { onlyIfMissing: true });
  });
