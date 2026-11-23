import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import { drive } from "@masseater.dev/fumx-studio/dsp/shape";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { Option } from "effect";

import type { Life } from "./context.ts";
import { LEVEL } from "./levels.ts";
import { stemmed } from "./tone.ts";

const NONE = 0;
const ONE = 1;

const CONTROL_RATE = 16;
const MID = {
  sweep: { kind: SVF.low, resonance: 2.6 },
  drive: { pre: 2.8, post: 0.42, bias: 0.12 },
  rumble: { kind: SVF.high, cutoff: 95, resonance: 0.7 },
  fizz: { kind: SVF.low, cutoff: 5200, resonance: 0.7 },
} as const;
const SUB = {
  low: { kind: SVF.low, cutoff: 125, resonance: 0.8 },
  drive: { pre: 1.6, post: 0.62 },
} as const;
const DUCK = { floor: 0.1, depth: 0.9 };
const STEMS = [
  { name: "BASS SUB", level: 1 },
  { name: "BASS MID", level: 0.9 },
] as const;
const MID_LEVEL = 0.9;

const shaped = (life: Life): void => {
  const mid = life.rack.get("BASS MID").left;
  const sub = life.rack.get("BASS SUB").left;
  svf({ ...MID.sweep, cutoff: (index) => life.cutoffs[Math.floor(index / CONTROL_RATE)] ?? NONE })(
    mid,
  );
  drive({ ...MID.drive, from: 0, to: life.studio.frames })(mid);
  svf(MID.rumble)(mid);
  svf(MID.fizz)(mid);
  svf(SUB.low)(sub);
  drive(SUB.drive)(sub);
};

const stems = (life: Life, duck: Float32Array): void => {
  if (Option.isNone(life.tape)) {
    return;
  }
  for (const { name, level } of STEMS) {
    const source = life.rack.get(name).left;
    const copy = life.studio.bus({});
    for (let index = 0; index < life.studio.frames; index += ONE) {
      const value =
        (source[index] ?? NONE) *
        level *
        (DUCK.floor + DUCK.depth * (duck[index] ?? NONE)) *
        LEVEL.bass;
      copy.left[index] = value;
      copy.right[index] = value;
    }
    stemmed(life)({ name, walled: true })(copy);
  }
};

export const bassBus =
  (life: Life) =>
  ({ main, duck }: Readonly<{ main: Bus; duck: Float32Array }>): void => {
    shaped(life);
    stems(life, duck);
    const sub = life.rack.get("BASS SUB");
    const mid = life.rack.get("BASS MID").left;
    for (let index = 0; index < life.studio.frames; index += ONE) {
      sub.left[index] =
        ((sub.left[index] ?? NONE) + (mid[index] ?? NONE) * MID_LEVEL) *
        (DUCK.floor + DUCK.depth * (duck[index] ?? NONE));
    }
    life.studio.mix({ into: main, gain: LEVEL.bass })(sub);
  };
