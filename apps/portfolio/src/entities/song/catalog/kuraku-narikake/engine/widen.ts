import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { activeIn } from "#/entities/song/lib/studio/activity.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { onePole } from "#/entities/song/lib/studio/dynamics.ts";

const PAD = 0.05;
const MILLI = 1e3;
const HALF = 0.5;
const ONE = 1;
const SILENT = 0;

export interface Spread {
  readonly milliseconds: number;
  readonly amount: number;
  readonly highPass: number;
}

const sideOf = (bus: Bus, [from, to, pole]: readonly [number, number, number]): Float32Array => {
  const side = new Float32Array(to - from);
  let low = SILENT;
  for (let index = from; index < to; index += ONE) {
    const value = ((bus.left[index] ?? SILENT) + (bus.right[index] ?? SILENT)) * HALF;
    low += pole * (value - low);
    side[index - from] = value - low;
  }
  return side;
};

export const spread =
  (frames: number) =>
  ({ milliseconds, amount, highPass }: Spread) =>
  (bus: Bus): void => {
    const delay = Math.round((milliseconds * SAMPLE_RATE) / MILLI);
    const pole = onePole(highPass);
    for (const [from, to] of activeIn({ frames, pad: PAD })(bus)) {
      const start = Math.max(delay, from);
      const side = sideOf(bus, [start - delay, to, pole]);
      for (let index = start; index < to; index += ONE) {
        const value = (side[index - start] ?? SILENT) * amount;
        bus.left[index] = (bus.left[index] ?? SILENT) + value;
        bus.right[index] = (bus.right[index] ?? SILENT) - value;
      }
    }
  };
