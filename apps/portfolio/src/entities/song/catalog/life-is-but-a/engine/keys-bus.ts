import { biquad } from "@masseater.dev/fumx-studio/dsp/biquad";
import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import { drive } from "@masseater.dev/fumx-studio/dsp/shape";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import type { Life } from "./context.ts";
import { LEVEL } from "./levels.ts";
import { kept } from "./tone.ts";

const ORGAN = {
  rumble: { kind: SVF.high, cutoff: 190, resonance: 0.7 },
  drive: { pre: 1.7, post: 0.66 },
  fizz: { kind: SVF.low, cutoff: 6500, resonance: 0.7 },
  honk: { kind: "peak", hertz: 1700, gain: -2, resonance: 1 },
  chorus: { depth: 2.2, rate: 0.6, amount: 0.55 },
  duck: 0.35,
} as const;
const PIANO = {
  rumble: { kind: SVF.high, cutoff: 210, resonance: 0.7 },
  presence: { kind: "peak", hertz: 2500, gain: 2, resonance: 0.8 },
  chorus: { depth: 3, rate: 0.35, amount: 0.5, base: 12 },
  duck: 0.4,
} as const;
const PAD = {
  rumble: { kind: SVF.high, cutoff: 230, resonance: 0.7 },
  chorus: { depth: 4, rate: 0.22, amount: 0.7, base: 14 },
  width: { width: 1.15, monoBelow: 250 },
  duck: 0.72,
} as const;
const SENDS = [
  { from: "ORGAN", to: "PLATE SEND", gain: 0.2 },
  { from: "FM PIANO", to: "PLATE SEND", gain: 0.2 },
  { from: "PAD", to: "PLATE SEND", gain: 0.16 },
  { from: "ORGAN", to: "DELAY SEND", gain: 0.1 },
  { from: "FM PIANO", to: "DELAY SEND", gain: 0.16 },
] as const;
const MIXED = [
  { name: "ORGAN", level: LEVEL.organ },
  { name: "FM PIANO", level: LEVEL.keys },
  { name: "PAD", level: LEVEL.pad },
] as const;

const organ = (life: Life, duck: Float32Array): void => {
  const bus = life.rack.get("ORGAN");
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      svf({ ...ORGAN.rumble, from, to })(channel);
      drive({ ...ORGAN.drive, from, to })(channel);
      svf({ ...ORGAN.fizz, from, to })(channel);
      biquad({ ...ORGAN.honk, from, to })(channel);
    },
  })(bus);
  life.studio.chorus(ORGAN.chorus)(bus);
  life.studio.envelope({ envelope: duck, depth: ORGAN.duck })(bus);
};

const piano = (life: Life, duck: Float32Array): void => {
  const bus = life.rack.get("FM PIANO");
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      svf({ ...PIANO.rumble, from, to })(channel);
      biquad({ ...PIANO.presence, from, to })(channel);
    },
  })(bus);
  life.studio.chorus(PIANO.chorus)(bus);
  life.studio.envelope({ envelope: duck, depth: PIANO.duck })(bus);
};

const pad = (life: Life, duck: Float32Array): void => {
  const bus = life.rack.get("PAD");
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      svf({ ...PAD.rumble, from, to })(channel);
    },
  })(bus);
  life.studio.chorus(PAD.chorus)(bus);
  life.studio.widen(PAD.width)(bus);
  life.studio.envelope({ envelope: duck, depth: PAD.duck })(bus);
};

export const keysBus =
  (life: Life) =>
  ({ main, duck }: Readonly<{ main: Bus; duck: Float32Array }>): void => {
    organ(life, duck);
    piano(life, duck);
    pad(life, duck);
    for (const { from, to, gain } of SENDS) {
      life.studio.mix({ into: life.rack.get(to), gain })(life.rack.get(from));
    }
    for (const { name, level } of MIXED) {
      kept(life)({ name, level, walled: true })(life.rack.get(name));
    }
    for (const { name, level } of MIXED) {
      life.studio.mix({ into: main, gain: level })(life.rack.get(name));
      life.rack.drop(name);
    }
  };
