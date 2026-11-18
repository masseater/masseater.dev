import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";

import type { Life } from "./context.ts";

const CONTROL_RATE = 16;
const SPILL = 2;
const ONE = 1;
const HALF = 0.5;
const TWO = 2;
const PLUCK = { floor: 170, depth: 1500, decay: 0.065 };
const SWELL = { floor: 150, depth: 1700, curve: 1.4 };
const WOBBLE = { floor: 190, depth: 1500 };
const RISE = { floor: 240, depth: 2600 };
const FALL = { floor: 150, depth: 1900 };

interface Shape {
  readonly amount: number;
  readonly elapsed: number;
  readonly duration: number;
  readonly period: number;
}

const pluck = ({ amount, elapsed }: Shape): number =>
  PLUCK.floor + PLUCK.depth * amount * Math.exp(-elapsed / PLUCK.decay);

const swell = ({ amount, elapsed, duration }: Shape): number =>
  SWELL.floor +
  SWELL.depth * amount * Math.sin(Math.PI * Math.min(ONE, elapsed / duration)) ** SWELL.curve;

const wobble = ({ amount, elapsed, period }: Shape): number =>
  WOBBLE.floor +
  WOBBLE.depth * amount * (HALF - HALF * Math.cos((TWO * Math.PI * elapsed) / period));

const rise = ({ amount, elapsed, duration }: Shape): number =>
  RISE.floor + RISE.depth * amount * (elapsed / duration) * (elapsed / duration);

const fall = ({ amount, elapsed, duration }: Shape): number =>
  FALL.floor + FALL.depth * amount * (ONE - Math.min(ONE, elapsed / duration)) ** TWO;

const SHAPES: readonly ((shape: Shape) => number)[] = [pluck, swell, wobble, rise];

export interface Sweep {
  readonly shape: number;
  readonly amount: number;
  readonly period: number;
  readonly from: number;
  readonly to: number;
  readonly duration: number;
}

export const sweepOf =
  (life: Life) =>
  ({ shape, amount, from, to, duration, ...sweep }: Sweep): void => {
    const first = Math.floor(from / CONTROL_RATE);
    const last = Math.floor(to / CONTROL_RATE);
    const cutoffAt = SHAPES[shape] ?? fall;
    const period = life.grid.sixteenth * sweep.period;
    for (let index = first; index <= last + SPILL && index < life.cutoffs.length; index += ONE) {
      const elapsed = ((index - first) * CONTROL_RATE) / SAMPLE_RATE;
      life.cutoffs[index] = cutoffAt({ amount, elapsed, duration, period });
    }
  };
