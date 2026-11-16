import { Schema } from "effect";

/** @internal */
export const LOCATION_SUFFIX = "_location";

const QuestionSchema = Schema.Struct({
  type: Schema.String,
  instructions: Schema.String,
  criteria: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
});

const TextRecord = Schema.Record(Schema.String, Schema.String);

/** @internal */
export const BodySchema = Schema.Struct({
  model: Schema.String,
  state: Schema.Struct({
    snippets: TextRecord,
    contexts: Schema.optionalKey(TextRecord),
  }),
  questions: Schema.Record(Schema.String, QuestionSchema),
});

/** @internal */
export type Body = typeof BodySchema.Type;

/** @internal */
export type Question = typeof QuestionSchema.Type;
