import { Schema } from "effect";

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
