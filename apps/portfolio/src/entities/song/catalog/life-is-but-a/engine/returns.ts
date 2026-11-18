import { convolve } from "@masseater.dev/fumx-studio/dsp/convolve";
import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import type { Life } from "./context.ts";
import { LEVEL } from "./levels.ts";
import { kept } from "./tone.ts";

const FIRST = 0;
const DELAY = {
  rumble: { kind: SVF.high, cutoff: 300, resonance: 0.7 },
  sixteenths: 3,
  echo: { feedback: 0.46, lowPass: 3600, highPass: 350, cross: 1 },
  plate: 0.3,
  duck: 0.3,
} as const;
const PLATE = {
  predelay: 0.018,
  rumble: { kind: SVF.high, cutoff: 280, resonance: 0.7 },
  fizz: { kind: SVF.low, cutoff: 8e3, resonance: 0.7 },
  gain: 0.055,
  duck: 0.45,
} as const;
const IMPULSES = { left: "irL", right: "irR" } as const;

export interface Returning {
  readonly main: Bus;
  readonly duck: Float32Array;
}

export const delayReturn =
  (life: Life) =>
  ({ main, duck }: Returning): void => {
    const send = life.rack.get("DELAY SEND");
    life.studio.each({
      frames: life.studio.frames,
      edit: (channel, from, to) => {
        svf({ ...DELAY.rumble, from, to })(channel);
      },
    })(send);
    const echo = life.studio.delay({
      ...DELAY.echo,
      seconds: life.grid.sixteenth * DELAY.sixteenths,
    })(send);
    life.studio.mix({ into: life.rack.get("PLATE SEND"), gain: DELAY.plate })(echo);
    life.studio.envelope({ envelope: duck, depth: DELAY.duck })(echo);
    kept(life)({ name: "DELAY SEND", level: LEVEL.delay, walled: true })(echo);
    life.studio.mix({ into: main, gain: LEVEL.delay })(echo);
    life.rack.drop("DELAY SEND");
  };

const shifted = (life: Life, channel: Float32Array): Float32Array => {
  const lead = Math.round(PLATE.predelay * SAMPLE_RATE);
  const { frames } = life.studio;
  const moved = new Float32Array(frames);
  moved.set(channel.subarray(FIRST, frames - lead), lead);
  return moved;
};

export interface Plate {
  readonly send: Bus;
  readonly plate: Bus;
}

export const plateOpened = (life: Life): Plate => {
  const send = life.rack.get("PLATE SEND");
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      svf({ ...PLATE.rumble, from, to })(channel);
      svf({ ...PLATE.fizz, from, to })(channel);
    },
  })(send);
  return { send, plate: life.studio.bus({}) };
};

export const plateSide =
  (life: Life) =>
  (side: keyof typeof IMPULSES) =>
  ({ send, plate }: Plate): void => {
    const impulse = life.samples[IMPULSES[side]] ?? new Float32Array();
    convolve({ impulse, out: plate[side], gain: PLATE.gain })(shifted(life, send[side]));
  };

export const plateClosed =
  (life: Life) =>
  ({ main, duck }: Returning, { plate }: Plate): void => {
    life.studio.envelope({ envelope: duck, depth: PLATE.duck })(plate);
    kept(life)({ name: "PLATE SEND", level: LEVEL.plate, walled: true })(plate);
    life.studio.mix({ into: main, gain: LEVEL.plate })(plate);
    life.rack.drop("PLATE SEND");
  };
