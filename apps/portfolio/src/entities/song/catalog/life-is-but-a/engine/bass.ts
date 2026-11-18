import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import type { Point } from "@masseater.dev/fumx-studio/dsp/shape";
import { Predicate } from "effect";

import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";

import { entryOf } from "./context.ts";
import type { Life } from "./context.ts";
import { chordOf } from "./harmony.ts";
import { pasteAt } from "./hits.ts";
import { sweepOf } from "./sweep.ts";

const ONE = 1;
const NONE = 0;
const OCTAVE = 12;
const GAP = 6e-3;
const PITCH = { glide: 0.045, toAt: 0.55 };
const SUB = { offset: 0.4, attack: 5e-3, release: 0.025, gain: 0.62 };
const MID = { source: "b_101", offset: 0.02, attack: 3e-3, release: 0.02, gain: 0.5 };
const ORGAN = { longest: 0.15, gain: 0.2, attack: 1e-3, release: 0.03 };
const THICK = { offset: 0.3, spread: 0.6, attack: 3e-3, release: 0.02, gain: 0.16 };

export interface BassShape {
  readonly sweep?: number;
  readonly accent?: number;
  readonly from?: number;
  readonly glide?: number;
  readonly to?: number;
  readonly toAt?: number;
  readonly period?: number;
  readonly amount?: number;
  readonly source?: string;
  readonly octave?: number;
  readonly thick?: number;
}

export interface BassNote extends BassShape {
  readonly bar: number;
  readonly step: number;
  readonly length: number;
  readonly key: number;
}

const glideOf = (shape: BassShape, duration: number): readonly Point[] => {
  const start: readonly Point[] = [
    [NONE, shape.from ?? NONE],
    [shape.glide ?? PITCH.glide, NONE],
  ];
  if (Predicate.isUndefined(shape.to) || shape.to === NONE) {
    return [...start, [duration, NONE]];
  }
  return [...start, [duration * (shape.toAt ?? PITCH.toAt), NONE], [duration, shape.to]];
};

const midiOf = (life: Life, name: string): number => entryOf(life)(name).midi ?? NONE;

interface Voiced {
  readonly note: BassNote;
  readonly time: number;
  readonly duration: number;
  readonly pitch: readonly Point[];
}

const sub = (life: Life, { note, time, duration, pitch }: Voiced): void => {
  pasteAt(life)("BASS SUB", "b_sub")(time, {
    offset: SUB.offset,
    semitones: note.key - midiOf(life, "b_sub"),
    duration,
    attack: SUB.attack,
    release: SUB.release,
    pitch,
    gain: SUB.gain,
  });
};

const mid = (life: Life, { note, time, duration, pitch }: Voiced): void => {
  const source = note.source ?? MID.source;
  pasteAt(life)("BASS MID", source)(time, {
    offset: MID.offset,
    semitones: (note.octave ?? NONE) * OCTAVE + note.key - midiOf(life, source),
    duration,
    attack: MID.attack,
    release: MID.release,
    pitch,
    gain: MID.gain * (note.accent ?? ONE),
  });
};

const plain = (note: BassNote): boolean =>
  Predicate.isUndefined(note.source) &&
  (note.sweep ?? NONE) === NONE &&
  (note.from ?? NONE) === NONE;

const organ = (life: Life, { note, time, duration }: Voiced): void => {
  if (!plain(note)) {
    return;
  }
  life.studio.note({
    bus: life.rack.get("BASS MID"),
    group: "org",
    key: note.key + OCTAVE,
    time,
    placement: {
      duration: Math.min(duration, ORGAN.longest),
      gain: ORGAN.gain * (note.accent ?? ONE),
      attack: ORGAN.attack,
      release: ORGAN.release,
    },
  });
};

const thick = (life: Life, { note, time, duration, pitch }: Voiced): void => {
  const level = note.thick ?? NONE;
  if (level === NONE) {
    return;
  }
  pasteAt(life)("BASS MID", "b_thick")(time, {
    offset: THICK.offset + THICK.spread * life.random(),
    semitones: note.key - midiOf(life, "b_thick"),
    duration,
    attack: THICK.attack,
    release: THICK.release,
    pitch,
    gain: THICK.gain * level,
  });
};

export const bassNote =
  (life: Life) =>
  (note: BassNote): void => {
    const time = life.grid.at(note.bar, note.step);
    const duration = life.grid.at(note.bar, note.step + note.length) - time - GAP;
    const voiced = { note, time, duration, pitch: glideOf(note, duration) };
    sub(life, voiced);
    mid(life, voiced);
    organ(life, voiced);
    thick(life, voiced);
    sweepOf(life)({
      note,
      from: Math.round(time * SAMPLE_RATE),
      to: Math.round((time + duration) * SAMPLE_RATE),
      duration,
    });
  };

export interface BassBar {
  readonly bar: number;
  readonly pattern: string;
  readonly thick?: number;
}

const BASS: Readonly<
  Record<
    string,
    readonly (BassShape & Readonly<{ step: number; length: number; interval: number }>)[]
  >
> = patterns.bass;

export const bassBar =
  (life: Life) =>
  ({ bar, pattern, ...shape }: BassBar): void => {
    const { root } = chordOf(bar);
    for (const { step, length, interval, ...rest } of BASS[pattern] ?? []) {
      bassNote(life)({ ...rest, ...shape, bar, step, length, key: root + interval });
    }
  };
