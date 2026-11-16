import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";
import { orDefault } from "#/entities/song/lib/dsp/number.ts";

import type { Life } from "./context.ts";
import { chordOf } from "./harmony.ts";

const ONE = 1;
const NONE = 0;
const OCTAVE = 12;
const ORGAN = {
  gain: 0.2,
  spread: 15e-4,
  top: 1.15,
  inner: 0.9,
  pan: -0.25,
  width: 0.5,
  attack: 1e-3,
  release: 0.035,
  later: 0.88,
  topEvery: 3,
  topAt: 2,
  pair: 2,
};

export interface Chorded {
  readonly bar: number;
  readonly step: number;
  readonly length: number;
  readonly keys: readonly number[];
  readonly gain?: number;
  readonly release?: number;
}

const organGain = (index: number, count: number): number => {
  if (index === count - ONE) {
    return ORGAN.top;
  }
  return ORGAN.inner;
};

export const organHit =
  (life: Life) =>
  ({ bar, step, length, keys, gain, release }: Chorded): void => {
    const time = life.grid.at(bar, step);
    const duration = life.grid.at(bar, step + length) - time;
    const level = (gain ?? ONE) * ORGAN.gain;
    for (const [index, key] of keys.entries()) {
      life.studio.note({
        bus: life.rack.get("ORGAN"),
        group: "org",
        key,
        time: time + index * ORGAN.spread,
        placement: {
          gain: level * organGain(index, keys.length),
          pan: ORGAN.pan + (ORGAN.width * index) / orDefault(ONE)(keys.length - ONE),
          duration,
          attack: ORGAN.attack,
          release: orDefault(ORGAN.release)(release),
        },
      });
    }
  };

export interface OrganBar {
  readonly bar: number;
  readonly pattern: string;
  readonly top?: number;
  readonly invert?: boolean;
  readonly gain?: number;
}

const voicingOf = (spec: OrganBar, index: number): readonly number[] => {
  const [first = NONE, second = NONE, third = NONE, fourth = NONE] = chordOf(spec.bar).keys;
  const top = orDefault(NONE)(spec.top);
  let keys = [first, second, third, fourth];
  if (top !== NONE && index % ORGAN.topEvery === ORGAN.topAt) {
    keys = [first, second, third, fourth + top];
  }
  if (spec.invert === true && index % ORGAN.pair === ONE) {
    keys = [second, third, fourth, first + OCTAVE];
  }
  return keys;
};

const ORGAN_PATTERNS: Readonly<
  Record<string, readonly Readonly<{ step: number; length: number }>[]>
> = patterns.organ;

export const organBar =
  (life: Life) =>
  (spec: OrganBar): void => {
    for (const [index, { step, length }] of (ORGAN_PATTERNS[spec.pattern] ?? []).entries()) {
      let accent = ORGAN.later;
      if (index === NONE) {
        accent = ONE;
      }
      organHit(life)({
        bar: spec.bar,
        step,
        length,
        keys: voicingOf(spec, index),
        gain: orDefault(ONE)(spec.gain) * accent,
      });
    }
  };

const PIANO = {
  gain: 0.2,
  strum: 4e-3,
  pan: -0.3,
  width: 0.6,
  voices: 3,
  release: 0.08,
  attack: 2e-3,
};

export interface Piano extends Chorded {
  readonly strum?: number;
}

export const pianoChord =
  (life: Life) =>
  ({ bar, step, length, keys, gain, release, strum }: Piano): void => {
    const time = life.grid.at(bar, step);
    const duration = life.grid.at(bar, step + length) - time;
    for (const [index, key] of keys.entries()) {
      life.studio.note({
        bus: life.rack.get("FM PIANO"),
        group: "fm",
        key: key - OCTAVE,
        time: time + index * orDefault(PIANO.strum)(strum),
        placement: {
          gain: PIANO.gain * orDefault(ONE)(gain),
          pan: PIANO.pan + (PIANO.width * index) / PIANO.voices,
          duration,
          release: orDefault(PIANO.release)(release),
          attack: PIANO.attack,
        },
      });
    }
  };
