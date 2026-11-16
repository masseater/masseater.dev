import { SAMPLE_RATE, orDefault } from "#/entities/song/lib/dsp/number.ts";

import type { Life } from "./context.ts";
import { hit, pasteAt } from "./hits.ts";

const TWO = 2;

const ONE = 1;
const NONE = 0;
const ROLL = {
  epsilon: 1e-6,
  first: { until: 0.5, step: 1 },
  second: { until: 0.8, step: 0.5 },
  last: 0.25,
  duration: 0.1,
  release: 0.03,
  highPass: 200,
  pan: 0.2,
};

export interface Roll {
  readonly bar: number;
  readonly from: number;
  readonly to: number;
  readonly sample: string;
  readonly startGain: number;
  readonly endGain: number;
  readonly accelerate?: boolean;
  readonly rise?: number;
  readonly division?: number;
  readonly highPass?: number;
  readonly semitones?: number;
}

const strideOf = (roll: Roll, share: number): number => {
  if (roll.accelerate !== true) {
    return orDefault(ONE)(roll.division);
  }
  if (share < ROLL.first.until) {
    return ROLL.first.step;
  }
  if (share < ROLL.second.until) {
    return ROLL.second.step;
  }
  return ROLL.last;
};

const sideOf = (count: number): number => {
  if (count % TWO === ONE) {
    return ROLL.pan;
  }
  return -ROLL.pan;
};

export const rollAt =
  (life: Life) =>
  (roll: Roll): void => {
    let step = roll.from;
    let count = NONE;
    while (step < roll.to - ROLL.epsilon) {
      const share = (step - roll.from) / (roll.to - roll.from);
      const stride = strideOf(roll, share);
      hit(life)({ bus: "DRUMS", sample: roll.sample, bar: roll.bar, step })({
        gain: roll.startGain + (roll.endGain - roll.startGain) * share,
        semitones: orDefault(NONE)(roll.semitones) + orDefault(NONE)(roll.rise) * share,
        duration: ROLL.duration,
        release: ROLL.release,
        highPass: orDefault(ROLL.highPass)(roll.highPass),
        pan: sideOf(count),
      });
      step += stride;
      count += ONE;
    }
  };

const CRASH = {
  low: { gain: 0.26, highPass: 500, release: 0.6, pan: -0.15 },
  send: { gain: 0.08, highPass: 800 },
  high: { gain: 0.3, highPass: 400, pan: 0.2 },
};

export interface Crash {
  readonly bar: number;
  readonly step?: number;
  readonly gain?: number;
}

export const crashAt =
  (life: Life) =>
  ({ bar, step, gain }: Crash): void => {
    const at = orDefault(NONE)(step);
    const level = orDefault(ONE)(gain);
    hit(life)({ bus: "DRUMS", sample: "cym808", bar, step: at })({
      ...CRASH.low,
      gain: CRASH.low.gain * level,
    });
    pasteAt(life)("PLATE SEND", "cym808")(life.grid.at(bar, at), {
      ...CRASH.send,
      gain: CRASH.send.gain * level,
    });
    hit(life)({ bus: "DRUMS", sample: "cym1", bar, step: at })({
      ...CRASH.high,
      gain: CRASH.high.gain * level,
    });
  };

const RISER = { gain: 0.34, send: 0.12, highPass: 900, pan: 0.1 };

export interface Riser {
  readonly bar: number;
  readonly seconds: number;
  readonly gain: number;
}

export const riserAt =
  (life: Life) =>
  ({ bar, seconds, gain }: Riser): void => {
    const sample = life.samples["cymrev"] ?? new Float32Array();
    const time = life.grid.at(bar, NONE) - seconds;
    const rate = sample.length / SAMPLE_RATE / seconds;
    const level = orDefault(ONE)(gain);
    const paste = pasteAt(life);
    paste("FX", "cymrev")(time, {
      rate,
      gain: RISER.gain * level,
      highPass: RISER.highPass,
      pan: RISER.pan,
    });
    paste("PLATE SEND", "cymrev")(time, {
      rate,
      gain: RISER.send * level,
      highPass: RISER.highPass,
    });
  };
