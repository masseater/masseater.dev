import { SAMPLE_RATE, orDefault, semitoneRatio } from "#/entities/song/lib/dsp/number.ts";
import type { Placement } from "#/entities/song/lib/studio/placement.ts";

import type { Life } from "./context.ts";
import type { Struck } from "./drums.ts";
import { hit, pasteAt } from "./hits.ts";

const NONE = 0;
const TWO = 2;

const HALF = 0.5;
const ONE = 1;
const OPEN = { length: 1.7, gain: 0.27, pan: 0.16, release: 0.035, highPass: 4200, semitones: -1 };
const SHAKER = {
  steps: 16,
  beat: 4,
  accentStep: 2,
  accent: 1,
  offbeat: 0.75,
  onbeat: 0.5,
  drift: 6e-3,
  gain: 0.2,
  floor: 0.85,
  swing: 0.3,
  placement: { pan: 0.42, duration: 0.11, release: 0.03, highPass: 3e3 },
};
const PERCUSSION = { gain: 0.3 };

export interface OpenHat extends Struck {
  readonly length?: number;
}

export const openHatAt =
  (life: Life) =>
  ({ bar, step, velocity, length }: OpenHat): void => {
    pasteAt(life)("DRUMS", "oh1")(life.grid.at(bar, step), {
      gain: OPEN.gain * velocity,
      pan: OPEN.pan,
      duration: orDefault(OPEN.length)(length) * life.grid.sixteenth,
      release: OPEN.release,
      highPass: OPEN.highPass,
      semitones: OPEN.semitones,
    });
  };

const accentOf = (step: number): number => {
  if (step % SHAKER.beat === SHAKER.accentStep) {
    return SHAKER.accent;
  }
  if (step % TWO === ONE) {
    return SHAKER.offbeat;
  }
  return SHAKER.onbeat;
};

const shakeSample = (step: number): string => {
  if (step % TWO === ONE) {
    return "shku";
  }
  return "shkd";
};

export interface Shaking {
  readonly bar: number;
  readonly level: number;
}

export const shaker =
  (life: Life) =>
  ({ bar, level }: Shaking): void => {
    for (let step = 0; step < SHAKER.steps; step += ONE) {
      const accent = accentOf(step);
      const time = life.grid.at(bar, step) + (life.random() - HALF) * SHAKER.drift;
      const gain = SHAKER.gain * level * accent * (SHAKER.floor + SHAKER.swing * life.random());
      pasteAt(life)("DRUMS", shakeSample(step))(time, { gain, ...SHAKER.placement });
    }
  };

export interface Percussion extends Struck {
  readonly sample: string;
  readonly pan?: number;
  readonly duration?: number;
  readonly highPass?: number;
  readonly semitones?: number;
}

export const percussionAt =
  (life: Life) =>
  ({ sample, bar, step, velocity, ...placement }: Percussion): void => {
    hit(life)({ bus: "DRUMS", sample, bar, step })({
      gain: PERCUSSION.gain * velocity,
      ...placement,
    });
  };

const AMEN = {
  slices: 8,
  semitones: 2.7,
  gain: 0.4,
  release: 0.012,
  highPass: 150,
  pan: -0.1,
};

export interface Amen {
  readonly bar: number;
  readonly step: number;
  readonly slice: number;
  readonly steps: number;
  readonly shift?: number;
  readonly gain?: number;
}

export const amenAt =
  (life: Life) =>
  ({ bar, step, slice, steps, shift, gain }: Amen): void => {
    const length = (life.samples["amen"] ?? new Float32Array()).length / SAMPLE_RATE / AMEN.slices;
    const semitones = AMEN.semitones + orDefault(NONE)(shift);
    const placement: Placement = {
      offset: slice * length,
      semitones,
      duration: Math.min(steps * life.grid.sixteenth, length / semitoneRatio(semitones)),
      gain: gain ?? AMEN.gain,
      release: AMEN.release,
      highPass: AMEN.highPass,
      pan: AMEN.pan,
    };
    hit(life)({ bus: "DRUMS", sample: "amen", bar, step })(placement);
  };
