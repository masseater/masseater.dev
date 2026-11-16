import type { Life } from "./context.ts";
import { hatAt } from "./drums.ts";
import { crashAt, riserAt, rollAt } from "./fills.ts";
import { drumBar } from "./groove.ts";
import { amenAt, percussionAt, shaker } from "./kit.ts";

export const rhythmEvents = (
  life: Life,
): Readonly<{
  drums: ReturnType<typeof drumBar>;
  hat: ReturnType<typeof hatAt>;
  amen: ReturnType<typeof amenAt>;
  roll: ReturnType<typeof rollAt>;
  shaker: ReturnType<typeof shaker>;
  percussion: ReturnType<typeof percussionAt>;
  crash: ReturnType<typeof crashAt>;
  riser: ReturnType<typeof riserAt>;
}> => ({
  drums: drumBar(life),
  hat: hatAt(life),
  amen: amenAt(life),
  roll: rollAt(life),
  shaker: shaker(life),
  percussion: percussionAt(life),
  crash: crashAt(life),
  riser: riserAt(life),
});
