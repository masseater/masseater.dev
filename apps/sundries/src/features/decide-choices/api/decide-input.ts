import { Array as Arr, Record as Rec, Schema } from "effect";

export const MAX_QUESTIONS = 64;
const MIN_QUESTIONS = 1;
const MAX_SNIPPET_CHARS = 8000;
const MAX_STATE_CHARS = 24_000;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 16;
const MAX_CHARS = 1000;
const NO_CHARS = 0;

const Text = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_CHARS));

const Snippets = Schema.Record(
  Schema.String,
  Schema.String.check(Schema.isMaxLength(MAX_SNIPPET_CHARS)),
);

const Criteria = Schema.Record(Schema.String, Text).check(
  Schema.isMinProperties(MIN_OPTIONS),
  Schema.isMaxProperties(MAX_OPTIONS),
);

export const ChoiceQuestion = Schema.Struct({
  type: Schema.Literal("choice"),
  instructions: Text,
  criteria: Criteria.annotate({ description: "Option id to when that option is right" }),
});

const Questions = Schema.Record(Schema.String, ChoiceQuestion).check(
  Schema.isMinProperties(MIN_QUESTIONS),
  Schema.isMaxProperties(MAX_QUESTIONS),
);

const stateChars = (snippets: Readonly<Record<string, string>>): number =>
  Arr.reduce(Rec.values(snippets), NO_CHARS, (total, text) => total + text.length);

export const DecideInput = Schema.Struct({
  snippets: Snippets.annotate({
    description: "Named pieces of text the questions refer to as state.snippets.<name>",
  }),
  questions: Questions.annotate({ description: `1 to ${String(MAX_QUESTIONS)} choice questions` }),
}).check(Schema.makeFilter(({ snippets }) => stateChars(snippets) <= MAX_STATE_CHARS));

export const ChoiceAnswer = Schema.Struct({
  choice: Schema.String,
  probabilities: Schema.optionalKey(Schema.Record(Schema.String, Schema.Finite)),
});

export const Decided = Schema.Struct({
  answers: Schema.Record(Schema.String, ChoiceAnswer),
});
