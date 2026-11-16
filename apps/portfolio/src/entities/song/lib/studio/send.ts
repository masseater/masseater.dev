import { Option } from "effect";

import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";

import { activeIn } from "./activity.ts";
import type { Bus } from "./bus.ts";

const CONTROL_RATE = 256;
const ONE = 1;
const HALF = 0.5;
const SILENT = 0;
const FIRST = 0;
const DEFAULT_EDGE = 3e-3;

export interface Send {
  readonly into: Bus;
  readonly gain: number;
  readonly shape: Option.Option<(seconds: number) => number>;
}

const levelOf = ({ gain, shape }: Send, index: number, level: number): number => {
  if (Option.isNone(shape) || index % CONTROL_RATE !== SILENT) {
    return level;
  }
  return gain * shape.value(index / SAMPLE_RATE);
};

export const sent =
  (frames: number) =>
  (send: Send) =>
  (from: Bus): void => {
    const { into } = send;
    for (const [start, end] of activeIn({ frames, pad: SILENT })(from)) {
      let level = send.gain;
      for (let index = start; index < end; index += ONE) {
        level = levelOf(send, index, level);
        const value = ((from.left[index] ?? SILENT) + (from.right[index] ?? SILENT)) * HALF * level;
        into.left[index] = (into.left[index] ?? SILENT) + value;
        if (!into.mono) {
          into.right[index] = (into.right[index] ?? SILENT) + value;
        }
      }
    }
  };

export type Window = readonly [from: number, to: number];

export type GateMode = "keep" | "cut";

export interface Windowing {
  readonly windows: readonly Window[];
  readonly mode: GateMode;
  readonly edge?: number;
}

interface Gate {
  readonly closed: number;
  readonly valueOf: (weight: number) => number;
  readonly opens: (value: number, current: number) => boolean;
}

const GATES: Readonly<Record<GateMode, Gate>> = {
  keep: { closed: SILENT, valueOf: (weight) => weight, opens: (value, current) => value > current },
  cut: {
    closed: ONE,
    valueOf: (weight) => ONE - weight,
    opens: (value, current) => value < current,
  },
};

const weightAt = (index: number, [start, end, edge]: readonly [number, number, number]): number => {
  if (index < start) {
    return (index - (start - edge)) / edge;
  }
  if (index >= end) {
    return ONE - (index - end) / edge;
  }
  return ONE;
};

const openedOver = (
  gate: Float32Array,
  window: Window,
  [edge, mode]: readonly [number, Gate],
): void => {
  const start = Math.round(window[FIRST] * SAMPLE_RATE);
  const end = Math.min(gate.length, Math.round(window[ONE] * SAMPLE_RATE));
  for (
    let index = Math.max(FIRST, start - edge);
    index < Math.min(gate.length, end + edge);
    index += ONE
  ) {
    const weight = weightAt(index, [start, end, edge]);
    const value = mode.valueOf(weight);
    if (mode.opens(value, gate[index] ?? SILENT)) {
      gate[index] = value;
    }
  }
};

export const gated =
  (frames: number) =>
  ({ windows, mode, edge }: Windowing) =>
  (bus: Bus): void => {
    const gating = GATES[mode];
    const gate = new Float32Array(frames).fill(gating.closed);
    const span = Math.max(ONE, Math.round((edge ?? DEFAULT_EDGE) * SAMPLE_RATE));
    for (const window of windows) {
      openedOver(gate, window, [span, gating]);
    }
    for (let index = FIRST; index < frames; index += ONE) {
      bus.left[index] = (bus.left[index] ?? SILENT) * (gate[index] ?? SILENT);
      if (!bus.mono) {
        bus.right[index] = (bus.right[index] ?? SILENT) * (gate[index] ?? SILENT);
      }
    }
  };
