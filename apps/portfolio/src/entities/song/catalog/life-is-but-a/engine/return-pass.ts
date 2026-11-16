import { Effect } from "effect";

import { delayReturn, plateClosed, plateOpened, plateSide } from "./returns.ts";
import { STAGES } from "./stages.ts";
import type { Ducked } from "./stages.ts";

export const returnPass = Effect.fn("life.returns")(function* returnPass({
  life,
  main,
  duck,
  reach,
}: Ducked) {
  yield* reach(STAGES.delay);
  delayReturn(life)({ main, duck });
  yield* reach(STAGES.plate);
  const plate = plateOpened(life);
  plateSide(life)("left")(plate);
  yield* reach(STAGES.plateRight);
  plateSide(life)("right")(plate);
  plateClosed(life)({ main, duck }, plate);
});
