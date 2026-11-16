import { Schema } from "effect";
import type { Option } from "effect";

import type { Label } from "#/entities/song/lib/studio/placement.ts";
import type { Studio } from "#/entities/song/lib/studio/studio.ts";
import type { Grid } from "#/entities/song/lib/studio/timing.ts";

import type { Rack } from "./rack.ts";

export interface Times {
  readonly add: (time: number) => void;
  readonly all: () => readonly number[];
}

export interface Life {
  readonly studio: Studio;
  readonly quiet: Studio;
  readonly grid: Grid;
  readonly random: () => number;
  readonly rack: Rack;
  readonly kicks: Times;
  readonly cutoffs: Float32Array;
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly table: Readonly<Record<string, SampleTableEntry>>;
  readonly labelled: (sample: Float32Array, label: Label) => void;
  readonly words: WordCache;
  readonly tape: Option.Option<Sink>;
}

const Numbers = Schema.Array(Schema.Finite);

const EntrySchema = Schema.Struct({
  key: Schema.optionalKey(Schema.Finite),
  midi: Schema.optionalKey(Schema.Finite),
  group: Schema.optionalKey(Schema.String),
  notes: Schema.optionalKey(Schema.Array(Numbers)),
});

export const SampleTableSchema = Schema.Record(Schema.String, EntrySchema);

export type SampleTableEntry = (typeof SampleTableSchema.Type)[string];

export interface WordCache {
  readonly get: (key: string) => Float32Array | undefined;
  readonly set: (key: string, sample: Float32Array) => void;
}

export interface Sink {
  readonly write: (
    name: string,
    left: Float32Array<ArrayBuffer>,
    right: Float32Array<ArrayBuffer>,
  ) => void;
}

const NO_ENTRY: SampleTableEntry = {};

export const entryOf =
  (life: Life) =>
  (name: string): SampleTableEntry =>
    life.table[name] ?? NO_ENTRY;
