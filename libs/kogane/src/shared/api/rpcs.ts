import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

export const SuggestionSchema = Schema.Struct({
  name: Schema.String,
  root: Schema.String,
  directory: Schema.String,
  description: Schema.String,
  score: Schema.Finite,
});

export type Suggestion = typeof SuggestionSchema.Type;

/** @internal */
export class KoganeRpcs extends RpcGroup.make(
  Rpc.make("Suggest", {
    payload: { directory: Schema.String, prompt: Schema.String },
    success: Schema.Array(SuggestionSchema),
  }),
) {}
