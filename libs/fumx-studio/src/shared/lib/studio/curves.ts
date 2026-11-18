import type { Bus } from "./bus.ts";

const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const NEXT = 1;

export interface Curve {
  readonly curve: Float32Array;
  readonly every: number;
}

export const curveAt =
  ({ curve, every }: Curve) =>
  (index: number): number => {
    const at = Math.trunc(index / every);
    const from = curve[at] ?? SILENT;
    return from + ((curve[at + NEXT] ?? SILENT) - from) * ((index - at * every) / every);
  };

export const curveApplied =
  (frames: number) =>
  (shape: Curve) =>
  (bus: Bus): void => {
    const gainAt = curveAt(shape);
    for (let index = FIRST; index < frames; index += STEP) {
      const gain = gainAt(index);
      bus.left[index] = (bus.left[index] ?? SILENT) * gain;
      bus.right[index] = (bus.right[index] ?? SILENT) * gain;
    }
  };

export interface Knee {
  readonly threshold: number;
  readonly knee: number;
}

export const clipped =
  ({ threshold, knee }: Knee) =>
  (value: number): number => {
    const level = Math.abs(value);
    if (level >= threshold) {
      return Math.sign(value) * (threshold + knee * Math.tanh((level - threshold) / knee));
    }
    return value;
  };

export const softClip =
  (shape: Knee) =>
  (channel: Float32Array): void => {
    const clip = clipped(shape);
    for (let index = FIRST; index < channel.length; index += STEP) {
      channel[index] = clip(channel[index] ?? SILENT);
    }
  };
