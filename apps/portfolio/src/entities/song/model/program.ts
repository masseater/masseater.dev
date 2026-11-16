import { Schema } from "effect";

export const FIELD = {
  sample: "s",
  start: "t",
  duration: "d",
  gain: "g",
  pitch: "m",
  frames: "N",
} as const;

const Glide = Schema.Array(Schema.Tuple([Schema.Finite, Schema.Finite]));

export const LoggedSchema = Schema.Struct({
  tr: Schema.String,
  [FIELD.sample]: Schema.String,
  [FIELD.start]: Schema.Finite,
  [FIELD.duration]: Schema.Finite,
  [FIELD.gain]: Schema.Finite,
  [FIELD.pitch]: Schema.NullOr(Schema.Finite),
  off: Schema.Finite,
  rev: Schema.Finite,
  pc: Schema.NullOr(Glide),
});

export type Logged = typeof LoggedSchema.Type;

export type Log = readonly (Logged | null)[];

export interface Ledger {
  readonly push: (...entries: Log) => number;
}

export type Lane = Readonly<Record<"v", ArrayLike<number>>> &
  Readonly<{
    lo: number;
    hi: number;
    log?: number;
    unit: string;
  }>;

export interface View {
  readonly auto?: Readonly<Record<string, Lane>>;
  readonly roots?: readonly number[];
}

export type SampleTable = Readonly<Record<string, unknown>>;

export type Form = Readonly<{
  title: string;
  BPM: number;
  SWING: number;
  BARS: number;
  TAIL: number;
  SEC: Readonly<Record<string, readonly [number, number]>>;
  MARKS: readonly (readonly [number, string])[];
}>;

export type Progressing = (share: number, label: string) => void;
