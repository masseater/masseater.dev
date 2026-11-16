import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import type { Targets } from "#/entities/song/lib/live/targets.ts";

import { banded } from "./core-bands.ts";
import { drumsBussed, interpolated } from "./core-drums.ts";
import type { Core } from "./core-state.ts";
import { advance, positionOf } from "./core-state.ts";
import { UNITY, stemsMixed } from "./core-stems.ts";
import { split, toned } from "./core-tone.ts";
import { MASTER } from "./mastering.ts";

const ONE = 1;
const SILENT = 0;
const FIRST = 0;

const cleared = ({ buffers }: Core, frames: number): void => {
  for (const buffer of [buffers.drumLeft, buffers.drumRight, buffers.left, buffers.right]) {
    buffer.fill(SILENT, FIRST, frames);
  }
};

const clamped = (value: number): number =>
  Math.max(-MASTER.ceiling, Math.min(MASTER.ceiling, value));

const FADE = {
  before: Math.round(MASTER.fade.before * SAMPLE_RATE),
  length: Math.round(MASTER.fade.length * SAMPLE_RATE),
} as const;

const gainAt = (core: Core, at: number): number => {
  const window = Math.trunc(at / MASTER.limit.every);
  const gain = interpolated(core.curves.limit)(
    window,
    (at - window * MASTER.limit.every) / MASTER.limit.every,
  );
  const fadeFrom = core.frames - FADE.before;
  if (at > fadeFrom) {
    return gain * Math.max(SILENT, ONE - (at - fadeFrom) / FADE.length);
  }
  return gain;
};

export interface Output {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly position: number;
  readonly frames: number;
}

export const finished =
  ({ left, right, position, frames }: Output) =>
  (core: Core): void => {
    for (let index = FIRST; index < frames; index += ONE) {
      const gain = gainAt(core, position + index);
      left[index] = clamped((left[index] ?? SILENT) * gain);
      right[index] = clamped((right[index] ?? SILENT) * gain);
    }
  };

const chunked = (
  core: Core,
  frames: number,
  [targets, detect]: readonly [Targets, boolean],
): void => {
  cleared(core, frames);
  if (positionOf(core) >= core.frames) {
    return;
  }
  stemsMixed({ frames, targets })(core);
  drumsBussed({ frames, detect })(core);
  split([toned(frames)(core), frames])(core);
  banded({ frames, detect })(core);
  if (!detect) {
    const { left, right } = core.buffers;
    finished({ left, right, position: positionOf(core), frames })(core);
  }
};

export interface Processing {
  readonly targets?: Targets;
  readonly detect: boolean;
}

export const processed =
  ({ targets, detect }: Processing) =>
  (core: Core) =>
  (left: Float32Array, right: Float32Array, frames: number): void => {
    for (let done = FIRST; done < frames;) {
      const count = Math.min(MASTER.block, frames - done);
      chunked(core, count, [targets ?? UNITY, detect]);
      left.set(core.buffers.left.subarray(FIRST, count), done);
      right.set(core.buffers.right.subarray(FIRST, count), done);
      done += count;
      advance(count)(core);
    }
  };
