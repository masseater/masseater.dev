import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";

import { activeIn } from "./activity.ts";
import type { Bus } from "./bus.ts";

const CONTROL_RATE = 16;
const ONE = 1;
const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const NO_PAD = 0;
const LEAD_SECONDS = 4e-3;
const SMOOTH = { three: 3, two: 2 } as const;

export interface Sending {
  readonly into: Bus;
  readonly gain?: number;
}

export const mixInto =
  (frames: number) =>
  ({ into, gain }: Sending) =>
  (from: Bus): void => {
    const level = gain ?? ONE;
    for (const [start, end] of activeIn({ frames, pad: NO_PAD })(from)) {
      for (let index = start; index < end; index += STEP) {
        into.left[index] = (into.left[index] ?? SILENT) + (from.left[index] ?? SILENT) * level;
        into.right[index] = (into.right[index] ?? SILENT) + (from.right[index] ?? SILENT) * level;
      }
    }
  };

export const gainOver =
  (frames: number) =>
  (gain: (seconds: number) => number) =>
  (bus: Bus): void => {
    let level = ONE;
    for (let index = FIRST; index < frames; index += STEP) {
      if (index % CONTROL_RATE === SILENT) {
        level = gain(index / SAMPLE_RATE);
      }
      bus.left[index] = (bus.left[index] ?? SILENT) * level;
      bus.right[index] = (bus.right[index] ?? SILENT) * level;
    }
  };

export interface Envelope {
  readonly envelope: Float32Array;
  readonly depth: number;
}

export const envelopeOver =
  (frames: number) =>
  ({ envelope, depth }: Envelope) =>
  (bus: Bus): void => {
    for (const [start, end] of activeIn({ frames, pad: NO_PAD })(bus)) {
      for (let index = start; index < end; index += STEP) {
        const level = ONE - depth * (ONE - (envelope[index] ?? SILENT));
        bus.left[index] = (bus.left[index] ?? SILENT) * level;
        if (!bus.mono) {
          bus.right[index] = (bus.right[index] ?? SILENT) * level;
        }
      }
    }
  };

export interface Ducking {
  readonly times: readonly number[];
  readonly hold: number;
  readonly release: number;
}

interface DuckShape {
  readonly lead: number;
  readonly hold: number;
  readonly release: number;
}

const duckLevel = ({ lead, hold, release }: DuckShape, offset: number): number => {
  if (offset < lead) {
    return ONE - offset / lead;
  }
  if (offset < lead + hold) {
    return SILENT;
  }
  const position = (offset - lead - hold) / release;
  return position * position * (SMOOTH.three - SMOOTH.two * position);
};

const ducked = (envelope: Float32Array, shape: DuckShape, time: number): void => {
  const start = Math.round(time * SAMPLE_RATE) - shape.lead;
  for (let offset = FIRST; offset < shape.lead + shape.hold + shape.release; offset += STEP) {
    const index = start + offset;
    const level = duckLevel(shape, offset);
    if (index >= FIRST && index < envelope.length && level < (envelope[index] ?? SILENT)) {
      envelope[index] = level;
    }
  }
};

export const duckEnvelope =
  (frames: number) =>
  ({ times, hold, release }: Ducking): Float32Array<ArrayBuffer> => {
    const envelope = new Float32Array(frames).fill(ONE);
    const shape = {
      lead: Math.round(LEAD_SECONDS * SAMPLE_RATE),
      hold: Math.round(hold * SAMPLE_RATE),
      release: Math.round(release * SAMPLE_RATE),
    };
    for (const time of times) {
      ducked(envelope, shape, time);
    }
    return envelope;
  };
