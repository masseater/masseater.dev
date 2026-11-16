import { MediaSchema } from "@masseater.dev/media-notes-protocol";
import { Schema } from "effect";

import { VerbSchema } from "./protocol.ts";

export const ClipSchema = Schema.Struct({
  media: MediaSchema,
  from: Schema.Finite,
  to: Schema.Finite,
}).annotate({ identifier: "Clip" });

export const ChoiceSchema = Schema.Literals(["first", "second", "neither"]).annotate({
  identifier: "Choice",
});

export const PairInputSchema = Schema.Struct({
  first: ClipSchema,
  second: ClipSchema,
}).annotate({ identifier: "PairInput" });

export const PairSchema = Schema.Struct({
  id: Schema.String,
  ...PairInputSchema.fields,
  at: Schema.Int,
  choice: Schema.NullOr(ChoiceSchema),
}).annotate({ identifier: "Pair" });

export const JudgementSchema = Schema.Literals(["right", "wrong"]).annotate({
  identifier: "Judgement",
});

export const StatementInputSchema = Schema.Struct({
  words: Schema.String,
  evidence: Schema.Array(Schema.String),
}).annotate({ identifier: "StatementInput" });

export const StatementSchema = Schema.Struct({
  id: Schema.String,
  ...StatementInputSchema.fields,
  at: Schema.Int,
  judgement: Schema.NullOr(JudgementSchema),
}).annotate({ identifier: "Statement" });

export const PredictionInputSchema = Schema.Struct({
  media: MediaSchema,
  from: Schema.Finite,
  to: Schema.Finite,
  verb: VerbSchema,
}).annotate({ identifier: "PredictionInput" });

export const PredictionSchema = Schema.Struct({
  id: Schema.String,
  ...PredictionInputSchema.fields,
  at: Schema.Int,
}).annotate({ identifier: "Prediction" });

export const VerdictSchema = Schema.Literals(["hit", "miss", "open"]).annotate({
  identifier: "Verdict",
});

export const ForecastSchema = Schema.Struct({
  prediction: PredictionSchema,
  verdict: VerdictSchema,
}).annotate({ identifier: "Forecast" });

export type Clip = typeof ClipSchema.Type;

export type Choice = typeof ChoiceSchema.Type;

export type PairInput = typeof PairInputSchema.Type;

export type Pair = typeof PairSchema.Type;

export type Judgement = typeof JudgementSchema.Type;

export type StatementInput = typeof StatementInputSchema.Type;

export type Statement = typeof StatementSchema.Type;

export type PredictionInput = typeof PredictionInputSchema.Type;

export type Prediction = typeof PredictionSchema.Type;

export type Verdict = typeof VerdictSchema.Type;

export type Forecast = typeof ForecastSchema.Type;
