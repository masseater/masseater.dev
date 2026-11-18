import { biquad } from "@masseater.dev/fumx-studio/dsp/biquad";
import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { Option } from "effect";

import type { Life } from "./context.ts";
import { cutUp } from "./cuts.ts";
import { walled } from "./wall.ts";

const NONE = 0;
const ONE = 1;

const TONE = {
  rumble: { kind: SVF.high, cutoff: 27, resonance: 0.7 },
  low: { kind: "low", hertz: 90, gain: 1, resonance: 0.7 },
  mud: { kind: "peak", hertz: 260, gain: -1.5, resonance: 0.9 },
  width: { width: 1, monoBelow: 140 },
  gain: 1.06,
} as const;

export const toned =
  (life: Life) =>
  (bus: Bus): void => {
    for (const channel of [bus.left, bus.right]) {
      svf(TONE.rumble)(channel);
      biquad(TONE.low)(channel);
      biquad(TONE.mud)(channel);
    }
    life.studio.widen(TONE.width)(bus);
    for (let index = 0; index < life.studio.frames; index += ONE) {
      bus.left[index] = (bus.left[index] ?? NONE) * TONE.gain;
      bus.right[index] = (bus.right[index] ?? NONE) * TONE.gain;
    }
  };

export interface Stem {
  readonly name: string;
  readonly walled: boolean;
}

export const stemmed =
  (life: Life) =>
  ({ name, walled: closed }: Stem) =>
  (bus: Bus): void => {
    if (Option.isNone(life.tape)) {
      return;
    }
    if (closed) {
      walled(life)(bus);
    }
    cutUp({ grid: life.grid, studio: life.quiet, bus });
    toned(life)(bus);
    life.tape.value.write(name, bus.left, bus.right);
  };

export interface Kept extends Stem {
  readonly level: number;
}

export const kept =
  (life: Life) =>
  ({ level, ...stem }: Kept) =>
  (bus: Bus): void => {
    if (Option.isNone(life.tape)) {
      return;
    }
    const copy = life.studio.bus({});
    life.studio.mix({ into: copy, gain: level })(bus);
    stemmed(life)(stem)(copy);
  };
