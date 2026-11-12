import { Schema } from "effect";

const Completion = Schema.Struct({
  content: Schema.String,
  stop_type: Schema.String,
  tokens_evaluated: Schema.Finite,
  tokens_predicted: Schema.Finite,
});

type CompletionValue = typeof Completion.Type;

export { Completion };
export type { CompletionValue };
