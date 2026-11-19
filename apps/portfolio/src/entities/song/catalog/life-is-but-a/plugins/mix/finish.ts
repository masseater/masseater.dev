import type { Mix } from "@masseater.dev/fumx-studio/plugin/plugin";

import { cutUp } from "./cuts.ts";
import { mastered } from "./master.ts";
import { MASTER } from "./mastering.ts";
import { mixedDown } from "./mixdown.ts";
import type { Pass } from "./passes.ts";
import { delayReturn, plateClosed, plateOpened, plateSide } from "./returns.ts";

export const returnPass =
  ({ session: { life }, main }: Pass) =>
  (duck: Float32Array): void => {
    delayReturn(life)({ main, duck });
    const plate = plateOpened(life);
    plateSide(life)("left")(plate);
    plateSide(life)("right")(plate);
    plateClosed(life)({ main, duck }, plate);
  };

export const masterPass = ({ session: { life, stems }, main }: Pass): Mix => {
  const lanes = mixedDown(life)(main);
  cutUp({ grid: life.grid, studio: life.studio, bus: main });
  const out = mastered(life)(main);
  return {
    left: out.left,
    right: out.right,
    stems,
    stages: [
      { kind: "gain", curve: out.compression, every: MASTER.compression.every },
      { kind: "clip", ...MASTER.clip },
      { kind: "gain", curve: out.limit, every: MASTER.limit.every },
    ],
    lanes,
  };
};
