import { Schema } from "effect";

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

const NOUL_CRITERIA = { true: "はい", false: "いいえ" };

const NOUL_THRESHOLD = 0.5;

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

const ItemSchema = Schema.Union([ChoiceItemSchema, NoulItemSchema, ScoreItemSchema]);

type Item = typeof ItemSchema.Type;
type Question = Item extends infer Each
  ? Each extends Item
    ? Pick<Each, "type" | "text" | "criteria" | "options">
    : never
  : never;
type ChoiceItem = typeof ChoiceItemSchema.Type;
type NoulItem = typeof NoulItemSchema.Type;
type ScoreItem = typeof ScoreItemSchema.Type;

const ProbabilitiesSchema = Schema.Record(Schema.String, Schema.Finite);

const DecisionSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("choice"),
    choice: Schema.String,
    probabilities: Schema.optional(ProbabilitiesSchema),
  }),
  Schema.Struct({ type: Schema.Literal("noul"), noul: Schema.Finite }),
  Schema.Struct({ type: Schema.Literal("score"), score: Schema.Finite }),
]);

const OutcomeSchema = Schema.Union([
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

type Outcome = typeof OutcomeSchema.Type;
type Decision = typeof DecisionSchema.Type;

interface Scored {
  readonly item: Item;
  readonly outcome: Outcome;
}

export { DecisionSchema, ItemSchema, NOUL_CRITERIA, NOUL_THRESHOLD, OutcomeSchema };
export type { ChoiceItem, Decision, Item, NoulItem, Outcome, Question, Scored, ScoreItem };
