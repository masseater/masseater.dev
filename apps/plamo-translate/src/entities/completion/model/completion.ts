import { Schema } from "effect";

export const Completion = Schema.Struct({
  content: Schema.String,
  stop_type: Schema.String,
  tokens_evaluated: Schema.Finite,
  tokens_predicted: Schema.Finite,
});

export type CompletionValue = typeof Completion.Type;
