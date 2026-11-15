import {
  DecisionsChoiceAnswer$inboundSchema,
  DecisionsNoulAnswer$inboundSchema,
  DecisionsScoreAnswer$inboundSchema,
} from "@openrouter/sdk/models";
import type {
  DecisionsChoiceAnswer,
  DecisionsNoulAnswer,
  DecisionsScoreAnswer,
} from "@openrouter/sdk/models";
import { Array as Arr, Schema, pipe } from "effect";

const common = {
  id: Schema.String,
  text: Schema.String,
  criteria: Schema.String,
  gold_source: Schema.Literals(["human", "llm"]),
  agreement: Schema.optionalKey(Schema.Finite),
  source: Schema.String,
  license: Schema.String,
  split: Schema.Literals(["test", "hard"]),
};

export const NOUL_CRITERIA = { true: "はい", false: "いいえ" };

export const NOUL_THRESHOLD = 0.5;

const ChoiceItemSchema = Schema.Struct({
  ...common,
  type: Schema.Literal("choice"),
  options: Schema.Record(Schema.String, Schema.String),
  gold: Schema.String,
});

const NoulItemSchema = Schema.Struct({
  ...common,
  type: Schema.Literal("noul"),
  options: Schema.Struct({ true: Schema.String, false: Schema.String }),
  gold: Schema.Boolean,
});

const ScoreItemSchema = Schema.Struct({
  ...common,
  type: Schema.Literal("score"),
  options: Schema.Array(Schema.String),
  gold: Schema.Finite,
});

export const ItemSchema = Schema.Union([ChoiceItemSchema, NoulItemSchema, ScoreItemSchema]);

export type Item = typeof ItemSchema.Type;
export type Question = Item extends infer Each
  ? Each extends Item
    ? Pick<Each, "type" | "text" | "criteria" | "options">
    : never
  : never;
export type ChoiceItem = typeof ChoiceItemSchema.Type;
export type NoulItem = typeof NoulItemSchema.Type;
export type ScoreItem = typeof ScoreItemSchema.Type;

export type Decision = DecisionsChoiceAnswer | DecisionsNoulAnswer | DecisionsScoreAnswer;

const ANSWER_SCHEMAS = [
  DecisionsChoiceAnswer$inboundSchema,
  DecisionsNoulAnswer$inboundSchema,
  DecisionsScoreAnswer$inboundSchema,
];

const isDecision = (input: unknown): input is Decision =>
  pipe(
    ANSWER_SCHEMAS,
    Arr.some((schema) => schema.safeParse(input).success),
  );

export const DecisionSchema = Schema.declare(isDecision);

export const OutcomeSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("answered"),
    decision: DecisionSchema,
    latencyMs: Schema.Finite,
    costUsd: Schema.Finite,
  }),
  Schema.Struct({
    status: Schema.Literal("failed"),
    reason: Schema.String,
    latencyMs: Schema.Finite,
  }),
]);

export type Outcome = typeof OutcomeSchema.Type;

export interface Scored {
  readonly item: Item;
  readonly outcome: Outcome;
}
