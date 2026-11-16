import { Schema } from "effect";

export interface Lane {
  readonly values: ArrayLike<number>;
  readonly low: number;
  readonly high: number;
  readonly log?: number;
  readonly unit: string;
}

export interface View {
  readonly auto?: Readonly<Record<string, Lane>>;
  readonly roots?: readonly number[];
}

export const FormSchema = Schema.Struct({
  title: Schema.String,
  BPM: Schema.Finite,
  SWING: Schema.Finite,
  BARS: Schema.Finite,
  TAIL: Schema.Finite,
  SEC: Schema.Record(Schema.String, Schema.Tuple([Schema.Finite, Schema.Finite])),
  MARKS: Schema.Array(Schema.Tuple([Schema.Finite, Schema.String])),
});

export type Form = typeof FormSchema.Type;
