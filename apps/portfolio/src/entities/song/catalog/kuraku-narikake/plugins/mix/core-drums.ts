import { softTanh } from "@masseater.dev/fumx-studio/dsp/shape";

import type { Core } from "./core-state.ts";
import { positionOf } from "./core-state.ts";
import { MASTERING } from "./mastering.ts";

const ONE = 1;
const HALF = 0.5;
const SIDE_SHARE = 0.7;
const SILENT = 0;
const FIRST = 0;
const AT = { envelope: 0, highPass: 1 } as const;

export interface Knee {
  readonly threshold: number;
  readonly knee: number;
}

export const kneed =
  ({ threshold, knee }: Knee) =>
  (value: number): number => {
    const size = Math.abs(value);
    if (size <= threshold) {
      return value;
    }
    return Math.sign(value) * (threshold + knee * Math.tanh((size - threshold) / knee));
  };

export const interpolated =
  (curve: Float32Array) =>
  (window: number, fraction: number): number => {
    const from = curve[window] ?? SILENT;
    return from + ((curve[window + ONE] ?? SILENT) - from) * fraction;
  };

const drumClipped = kneed(MASTERING.drum.clip);

const followed = (core: Core, level: number): void => {
  const { attack, release } = core.drum;
  const envelope = core.envelopes[AT.envelope] ?? SILENT;
  if (level > envelope) {
    core.envelopes[AT.envelope] = attack * envelope + (ONE - attack) * level;
    return;
  }
  core.envelopes[AT.envelope] = release * envelope + (ONE - release) * level;
};

const gainOf = (core: Core): number => {
  const envelope = core.envelopes[AT.envelope] ?? SILENT;
  if (envelope > core.drum.threshold) {
    return (
      (envelope / core.drum.threshold) ** (ONE / MASTERING.drum.ratio - ONE) * core.drum.makeup
    );
  }
  return core.drum.makeup;
};

const detected = (core: Core, left: number, right: number): void => {
  const highPass = core.envelopes[AT.highPass] ?? SILENT;
  const center = (left + right) * HALF;
  const filtered = highPass + core.drum.highPass * (center - highPass);
  core.envelopes[AT.highPass] = filtered;
  const level = Math.max(
    Math.abs(center - filtered),
    Math.abs(left) * SIDE_SHARE,
    Math.abs(right) * SIDE_SHARE,
  );
  followed(core, level);
};

const shaped = (value: number, gain: number): number =>
  drumClipped(softTanh(value * gain) * MASTERING.drum.post) * MASTERING.drum.out;

const sensed = (
  core: Core,
  [window, offset]: readonly [number, number],
  [left, right]: readonly [number, number],
): void => {
  if (offset === SILENT) {
    core.curves.drum[window + ONE] = gainOf(core);
  }
  detected(core, left, right);
};

const frameBussed = (core: Core, index: number, detect: boolean): void => {
  const { buffers, curves } = core;
  const at = positionOf(core) + index;
  const window = Math.trunc(at / MASTERING.every);
  const offset = at - window * MASTERING.every;
  const [left, right] = [buffers.drumLeft[index] ?? SILENT, buffers.drumRight[index] ?? SILENT];
  if (detect) {
    sensed(core, [window, offset], [left, right]);
  }
  const gain = interpolated(curves.drum)(window, offset / MASTERING.every) * MASTERING.drum.pre;
  buffers.left[index] = (buffers.left[index] ?? SILENT) + shaped(left, gain);
  buffers.right[index] = (buffers.right[index] ?? SILENT) + shaped(right, gain);
};

export interface Bussing {
  readonly frames: number;
  readonly detect: boolean;
}

export const drumsBussed =
  ({ frames, detect }: Bussing) =>
  (core: Core): void => {
    for (let index = FIRST; index < frames; index += ONE) {
      frameBussed(core, index, detect);
    }
  };
