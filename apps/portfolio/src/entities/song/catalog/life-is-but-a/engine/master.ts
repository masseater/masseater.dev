import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { curveApplied, softClip } from "#/entities/song/lib/studio/curves.ts";
import { compressionCurve } from "#/entities/song/lib/studio/dynamics.ts";
import { limitCurve } from "#/entities/song/lib/studio/limiter.ts";

import type { Life } from "./context.ts";
import { MASTER } from "./mastering.ts";
import { toned } from "./tone.ts";

export interface Mastered {
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly compression: Float32Array<ArrayBuffer>;
  readonly limit: Float32Array<ArrayBuffer>;
}

export const mastered =
  (life: Life) =>
  (main: Bus): Mastered => {
    const { frames } = life.studio;
    toned(life)(main);
    const compression = compressionCurve(frames)(MASTER.compression)(main);
    curveApplied(frames)({ curve: compression.curve, every: MASTER.compression.every })(main);
    softClip(MASTER.clip)(main.left);
    softClip(MASTER.clip)(main.right);
    const limited = limitCurve(MASTER.limit)(main);
    curveApplied(frames)({ curve: limited.curve, every: MASTER.limit.every })(main);
    return {
      left: main.left,
      right: main.right,
      compression: compression.curve,
      limit: limited.curve,
    };
  };
