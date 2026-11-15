import { Effect } from "effect";

import { correct } from "./correction.ts";
import { research } from "./research.ts";
import type { runners } from "./runners.ts";

type Assisting = Pick<Effect.Success<typeof runners>, "correcting" | "researching">;

const assistWith = ({ correcting, researching }: Assisting): Effect.Effect<void> =>
  Effect.sync(() => {
    correcting(correct(), { onlyIfMissing: true });
    researching(research(), { onlyIfMissing: true });
  });

/** @internal */
export { assistWith };
