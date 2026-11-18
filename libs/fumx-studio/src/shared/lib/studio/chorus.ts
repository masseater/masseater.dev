import { SAMPLE_RATE, orDefault } from "#/shared/lib/dsp/number.ts";

import { activeIn } from "./activity.ts";
import type { Bus } from "./bus.ts";

const CONTROL_RATE = 16;
const MAX_DELAY_SECONDS = 0.03;
const DEFAULT_BASE_MS = 9;
const MILLISECONDS = 1e3;
const PAD_SECONDS = 0.05;
const SPREAD = 2.1;
const TWO = 2;
const ONE = 1;
const SILENT = 0;
const STEP = 1;
const AT = { first: 0, second: 1, firstSlope: 2, secondSlope: 3, size: 4 } as const;

export interface Chorusing {
  readonly depth: number;
  readonly rate: number;
  readonly amount: number;
  readonly base?: number;
}

interface Voice {
  readonly state: Float64Array;
  readonly base: number;
  readonly depth: number;
  readonly rate: number;
}

const longest = Math.round(MAX_DELAY_SECONDS * SAMPLE_RATE);

const phaseAt = (rate: number, index: number): number =>
  (TWO * Math.PI * rate * index) / SAMPLE_RATE;

const retarget = (voice: Voice, index: number, first: boolean): void => {
  const { state, base, depth, rate } = voice;
  const ahead = phaseAt(rate, index + CONTROL_RATE);
  if (first) {
    const now = phaseAt(rate, index);
    state[AT.first] = base + depth * Math.sin(now);
    state[AT.second] = base + depth * Math.sin(now + SPREAD);
  }
  state[AT.firstSlope] =
    (base + depth * Math.sin(ahead) - (state[AT.first] ?? SILENT)) / CONTROL_RATE;
  state[AT.secondSlope] =
    (base + depth * Math.sin(ahead + SPREAD) - (state[AT.second] ?? SILENT)) / CONTROL_RATE;
};

const tapped = (copy: Float32Array, position: number): number => {
  const whole = Math.floor(position);
  const here = copy[whole] ?? SILENT;
  return here + ((copy[whole + ONE] ?? SILENT) - here) * (position - whole);
};

interface Region {
  readonly bus: Bus;
  readonly copies: readonly [Float32Array, Float32Array];
  readonly start: number;
  readonly amount: number;
}

const moved = (state: Float64Array): void => {
  state[AT.first] = (state[AT.first] ?? SILENT) + (state[AT.firstSlope] ?? SILENT);
  state[AT.second] = (state[AT.second] ?? SILENT) + (state[AT.secondSlope] ?? SILENT);
};

const sounded = ({ bus, copies, start, amount }: Region, voice: Voice, index: number): void => {
  const offset = index - start;
  const [left, right] = copies;
  const dry = offset + longest;
  bus.left[index] =
    (left[dry] ?? SILENT) + amount * tapped(left, dry - (voice.state[AT.first] ?? SILENT));
  bus.right[index] =
    (right[dry] ?? SILENT) + amount * tapped(right, dry - (voice.state[AT.second] ?? SILENT));
};

const chorused = (region: Region, voice: Voice, end: number): void => {
  for (let index = region.start; index < end; index += STEP) {
    const offset = index - region.start;
    if (offset % CONTROL_RATE === SILENT) {
      retarget(voice, index, offset === SILENT);
    }
    moved(voice.state);
    sounded(region, voice, index);
  }
};

export const chorus =
  (frames: number) =>
  ({ depth, rate, amount, base }: Chorusing) =>
  (bus: Bus): void => {
    const delay = (orDefault(DEFAULT_BASE_MS)(base) * SAMPLE_RATE) / MILLISECONDS;
    const swing = (depth * SAMPLE_RATE) / MILLISECONDS;
    for (const [from, end] of activeIn({ frames, pad: PAD_SECONDS })(bus)) {
      const start = Math.max(longest, from);
      const copies = [
        bus.left.slice(start - longest, end),
        bus.right.slice(start - longest, end),
      ] as const;
      const voice = { state: new Float64Array(AT.size), base: delay, depth: swing, rate };
      voice.state.fill(delay, AT.first, AT.secondSlope);
      voice.state.fill(SILENT, AT.firstSlope);
      chorused({ bus, copies, start, amount }, voice, end);
    }
  };
