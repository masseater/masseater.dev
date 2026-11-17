import { Schema } from "effect";

import type { Point } from "#/entities/song/lib/dsp/shape.ts";

export interface Sweep {
  readonly from: number;
  readonly to: number;
}

export interface Reversal {
  readonly from?: number;
}

export interface Placement {
  readonly gain?: number;
  readonly pan?: number;
  readonly rate?: number;
  readonly semitones?: number;
  readonly offset?: number;
  readonly duration?: number;
  readonly attack?: number;
  readonly release?: number;
  readonly decay?: number;
  readonly pitch?: readonly Point[];
  readonly lowPass?: number | Sweep;
  readonly highPass?: number;
  readonly resonance?: number;
  readonly drive?: number;
  readonly reverse?: Reversal;
  readonly midi?: number;
}

const Glide = Schema.Array(Schema.Tuple([Schema.Finite, Schema.Finite]));

export const LoggedSchema = Schema.Struct({
  track: Schema.String,
  sample: Schema.String,
  start: Schema.Finite,
  duration: Schema.Finite,
  pitch: Schema.optionalKey(Schema.Finite),
  gain: Schema.Finite,
  pan: Schema.Finite,
  offset: Schema.Finite,
  glide: Schema.optionalKey(Glide),
  reversed: Schema.Boolean,
  slice: Schema.optionalKey(Schema.Finite),
});

export type Logged = typeof LoggedSchema.Type;

export interface Ledger {
  readonly push: (...entries: readonly Logged[]) => number;
}

export interface Label {
  readonly name?: string;
  readonly midi?: number;
}

export interface SampleInfo {
  readonly key?: number;
  readonly midi?: number;
  readonly group?: string;
}

export const SampleTableSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    key: Schema.optionalKey(Schema.Finite),
    midi: Schema.optionalKey(Schema.Finite),
    group: Schema.optionalKey(Schema.String),
  }),
);
