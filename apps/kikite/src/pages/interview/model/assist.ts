import { Effect } from "effect";

import type { runners } from "#/shared/lib/runners";

import { correct } from "./correction.ts";
import { research } from "./research.ts";

type Assisting = Pick<Effect.Success<typeof runners>, "correcting" | "researching">;

/** @internal */
export const assistWith = ({ correcting, researching }: Assisting): Effect.Effect<void> =>
  Effect.sync(() => {
    correcting(correct(), { onlyIfMissing: true });
    researching(research(), { onlyIfMissing: true });
  });
