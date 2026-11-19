import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { curveApplied, softClip } from "@masseater.dev/fumx-studio/studio/curves";
import { compressionCurve } from "@masseater.dev/fumx-studio/studio/dynamics";
import { limitCurve } from "@masseater.dev/fumx-studio/studio/limiter";

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
