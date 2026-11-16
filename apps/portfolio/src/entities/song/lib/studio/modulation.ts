import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";

import { activeIn } from "./activity.ts";
import type { Bus } from "./bus.ts";

const CONTROL_RATE = 16;
const ONE = 1;
const TWO = 2;
const HALF = 0.5;
const SILENT = 0;
const STAGES = 4;
const PHASER_PAD = 0.1;
const RIGHT_PHASE = 1.3;

export interface Tremolo {
  readonly rate: number;
  readonly depth: number;
}

const tremoloSpan = (
  bus: Bus,
  { rate, depth }: Tremolo,
  [from, to]: readonly [number, number],
): void => {
  let left = ONE;
  let right = ONE;
  for (let index = from; index < to; index += ONE) {
    if (index % CONTROL_RATE === SILENT) {
      const swing = Math.sin((TWO * Math.PI * rate * index) / SAMPLE_RATE);
      left = ONE - depth * (HALF + HALF * swing);
      right = ONE - depth * (HALF - HALF * swing);
    }
    bus.left[index] = (bus.left[index] ?? SILENT) * left;
    bus.right[index] = (bus.right[index] ?? SILENT) * right;
  }
};

export const tremolo =
  (frames: number) =>
  (shape: Tremolo) =>
  (bus: Bus): void => {
    for (const region of activeIn({ frames, pad: SILENT })(bus)) {
      tremoloSpan(bus, shape, region);
    }
  };

export interface Phaser {
  readonly rate: number;
  readonly low: number;
  readonly high: number;
  readonly feedback: number;
  readonly amount: number;
  readonly from: number;
  readonly to: number;
}

interface Sweep {
  readonly shape: Phaser;
  readonly phase: number;
  readonly from: number;
  readonly to: number;
}

const coefficientAt = ({ shape, phase }: Sweep, index: number): number => {
  const position =
    HALF + HALF * Math.sin((TWO * Math.PI * shape.rate * index) / SAMPLE_RATE + phase);
  const hertz = shape.low * (shape.high / shape.low) ** position;
  const tangent = Math.tan((Math.PI * hertz) / SAMPLE_RATE);
  return (tangent - ONE) / (tangent + ONE);
};

const allPassed = (state: Float64Array, input: number, coefficient: number): number => {
  let x = input;
  for (let stage = SILENT; stage < STAGES; stage += ONE) {
    const y = coefficient * x + (state[stage] ?? SILENT);
    state[stage] = x - coefficient * y;
    x = y;
  }
  return x;
};

const swept = (channel: Float32Array, sweep: Sweep): void => {
  const state = new Float64Array(STAGES);
  let last = SILENT;
  let coefficient = SILENT;
  for (let index = sweep.from; index < sweep.to; index += ONE) {
    if (index % CONTROL_RATE === SILENT) {
      coefficient = coefficientAt(sweep, index);
    }
    last = allPassed(state, (channel[index] ?? SILENT) + last * sweep.shape.feedback, coefficient);
    channel[index] = (channel[index] ?? SILENT) + last * sweep.shape.amount;
  }
};

export const phaser =
  (frames: number) =>
  (shape: Phaser) =>
  (bus: Bus): void => {
    const start = Math.round(shape.from * SAMPLE_RATE);
    const end = Math.min(frames, Math.round(shape.to * SAMPLE_RATE));
    for (const [from, to] of activeIn({ frames, pad: PHASER_PAD })(bus)) {
      const span = { shape, from: Math.max(start, from), to: Math.min(end, to) };
      swept(bus.left, { ...span, phase: SILENT });
      if (!bus.mono) {
        swept(bus.right, { ...span, phase: RIGHT_PHASE });
      }
    }
  };
