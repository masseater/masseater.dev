import { biquad } from "@masseater.dev/fumx-studio/dsp/biquad";
import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import { drive } from "@masseater.dev/fumx-studio/dsp/shape";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import type { Life } from "./context.ts";
import { LEVEL } from "./levels.ts";
import { kept } from "./tone.ts";

const VOICE = {
  rumble: { kind: SVF.high, cutoff: 160, resonance: 0.7 },
  presence: { kind: "peak", hertz: 3400, gain: 1.5, resonance: 0.8 },
  air: { kind: "high", hertz: 9e3, gain: 2, resonance: 0.7 },
  box: { kind: "peak", hertz: 420, gain: -2, resonance: 1 },
  harsh: { kind: "peak", hertz: 1900, gain: -1.5, resonance: 1.2 },
  compression: { threshold: -17, ratio: 3, attack: 4, release: 110, makeup: 3.5 },
  drive: { pre: 1.2, post: 0.88 },
  duck: 0.18,
} as const;

const equalised = (life: Life, bus: Bus): void => {
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      svf({ ...VOICE.rumble, from, to })(channel);
      biquad({ ...VOICE.presence, from, to })(channel);
      biquad({ ...VOICE.air, from, to })(channel);
      biquad({ ...VOICE.box, from, to })(channel);
      biquad({ ...VOICE.harsh, from, to })(channel);
    },
  })(bus);
};

const squashed = (life: Life, voices: Bus): void => {
  life.studio.compress(VOICE.compression)(voices);
  life.studio.each({
    frames: life.studio.frames,
    edit: (channel, from, to) => {
      drive({ ...VOICE.drive, from, to })(channel);
    },
  })(voices);
};

export const voiceBus =
  (life: Life) =>
  ({ main, duck }: Readonly<{ main: Bus; duck: Float32Array }>): void => {
    const voices = life.rack.get("VOICES");
    const front = life.rack.get("FRONT VOICE");
    equalised(life, voices);
    equalised(life, front);
    squashed(life, voices);
    life.studio.envelope({ envelope: duck, depth: VOICE.duck })(voices);
    kept(life)({ name: "VOICES", level: LEVEL.voices, walled: true })(voices);
    kept(life)({ name: "FRONT VOICE", level: LEVEL.front, walled: false })(front);
    life.studio.mix({ into: main, gain: LEVEL.voices })(voices);
    life.rack.drop("VOICES");
  };
