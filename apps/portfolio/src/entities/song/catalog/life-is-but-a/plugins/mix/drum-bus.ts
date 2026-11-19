import { biquad } from "@masseater.dev/fumx-studio/dsp/biquad";
import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import { drive } from "@masseater.dev/fumx-studio/dsp/shape";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import type { Life } from "./context.ts";
import { LEVEL } from "./levels.ts";
import { kept } from "./tone.ts";

const DUCK = { hold: 0.028, release: 0.15 };
const KICK = {
  low: { kind: "low", hertz: 75, gain: 2.5, resonance: 0.8 },
  box: { kind: "peak", hertz: 320, gain: -3, resonance: 1.2 },
  click: { kind: "peak", hertz: 3500, gain: 2, resonance: 0.9 },
  drive: { pre: 1.25, post: 0.86 },
} as const;
const DRUMS = {
  rumble: { kind: SVF.high, cutoff: 110, resonance: 0.7 },
  air: { kind: "high", hertz: 8500, gain: 1.5, resonance: 0.7 },
  compression: { threshold: -16, ratio: 2.5, attack: 6, release: 90, makeup: 2.5 },
  drive: { pre: 1.15, post: 0.9 },
} as const;

const kickShaped = (life: Life, kick: Bus): void => {
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      biquad({ ...KICK.low, from, to })(channel);
      biquad({ ...KICK.box, from, to })(channel);
      biquad({ ...KICK.click, from, to })(channel);
      drive({ ...KICK.drive, from, to })(channel);
    },
  })(kick);
};

const drumsShaped = (life: Life, drums: Bus): void => {
  const { frames } = life.studio;
  life.studio.each({
    frames,
    edit: (channel, from, to) => {
      svf({ ...DRUMS.rumble, from, to })(channel);
      biquad({ ...DRUMS.air, from, to })(channel);
    },
  })(drums);
  life.studio.compress(DRUMS.compression)(drums);
  life.studio.each({
    frames,
    edit: (channel, from, to) => {
      drive({ ...DRUMS.drive, from, to })(channel);
    },
  })(drums);
};

const summed =
  (life: Life, main: Bus) =>
  (name: string, level: number) =>
  (bus: Bus): void => {
    kept(life)({ name, level, walled: true })(bus);
    life.studio.mix({ into: main, gain: level })(bus);
  };

export const drumBus =
  (life: Life) =>
  (main: Bus): Float32Array => {
    const duck = life.studio.duck({ times: life.kicks.all(), ...DUCK });
    const kick = life.rack.get("KICK");
    const drums = life.rack.get("DRUMS");
    kickShaped(life, kick);
    drumsShaped(life, drums);
    summed(life, main)("KICK", LEVEL.kick)(kick);
    summed(life, main)("DRUMS", LEVEL.drums)(drums);
    return duck;
  };
