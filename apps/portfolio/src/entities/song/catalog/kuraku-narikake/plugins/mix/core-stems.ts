import { trackAdded } from "@masseater.dev/fumx-studio/live/tape";
import { slide } from "@masseater.dev/fumx-studio/live/targets";
import type { Targets } from "@masseater.dev/fumx-studio/live/targets";
import { Array as Arr, pipe } from "effect";

import type { Core } from "./core-state.ts";
import { positionOf } from "./core-state.ts";

const ONE = 1;
const SILENT = 0;
const FIRST = 0;

export const UNITY: Targets = { left: new Float32Array(), right: new Float32Array() };

const targetOf = (targets: Targets, side: Float32Array, track: number): number => {
  if (targets === UNITY) {
    return ONE;
  }
  return side[track] ?? SILENT;
};

const busFor = ({ drums, buffers }: Core, track: number): readonly [Float32Array, Float32Array] => {
  if (drums[track] === true) {
    return [buffers.drumLeft, buffers.drumRight];
  }
  return [buffers.left, buffers.right];
};

const silent = (...values: readonly number[]): boolean =>
  pipe(
    values,
    Arr.every((value) => value === SILENT),
  );

const trackMixed = (
  core: Core,
  [frames, track]: readonly [number, number],
  targets: Targets,
): void => {
  const { buffers, gains } = core;
  const [leftFrom, rightFrom] = [gains.left[track] ?? SILENT, gains.right[track] ?? SILENT];
  const [leftTo, rightTo] = [
    targetOf(targets, targets.left, track),
    targetOf(targets, targets.right, track),
  ];
  if (silent(leftFrom, rightFrom, leftTo, rightTo)) {
    return;
  }
  gains.left[track] = slide({ ramp: buffers.rampLeft, frames, step: core.step })(leftFrom, leftTo);
  gains.right[track] = slide({ ramp: buffers.rampRight, frames, step: core.step })(
    rightFrom,
    rightTo,
  );
  const [left, right] = busFor(core, track);
  const position = positionOf(core);
  trackAdded({
    tape: core.tape,
    track,
    ramps: { left: buffers.rampLeft, right: buffers.rampRight },
  })(left, right, [position, Math.min(frames, core.frames - position)]);
};

export interface Mixing {
  readonly frames: number;
  readonly targets: Targets;
}

export const stemsMixed =
  ({ frames, targets }: Mixing) =>
  (core: Core): void => {
    for (let track = FIRST; track < core.drums.length; track += ONE) {
      trackMixed(core, [frames, track], targets);
    }
  };
