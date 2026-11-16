import { METHODS } from "@masseater.dev/ocr-decide";
import { Schema } from "effect";

const MethodSchema = Schema.Literals(METHODS);

const RateMapSchema = Schema.Record(Schema.String, Schema.Finite);

const RunSchema = Schema.Struct({
  method: MethodSchema,
  model: Schema.String,
  label: Schema.String,
  accuracy: Schema.Finite,
  byField: RateMapSchema,
  byGroup: RateMapSchema,
  secondsPerDocument: Schema.Finite,
  usdPerDocument: Schema.Finite,
  failed: Schema.Finite,
});

export const SummarySchema = Schema.Struct({
  generatedAt: Schema.String,
  documents: Schema.Finite,
  generatorModel: Schema.String,
  cutoff: Schema.Finite,
  rereadBelow: Schema.Finite,
  fields: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
  groups: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
  runs: Schema.Array(RunSchema),
});

export type Method = typeof MethodSchema.Type;

export type Run = typeof RunSchema.Type;

export type Summary = typeof SummarySchema.Type;
