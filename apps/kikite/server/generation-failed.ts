import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class GenerationFailed extends taggedError<GenerationFailed, { readonly brand: unique symbol }>()(
  "GenerationFailed",
  { message: Schema.String },
) {}

const failed = (cause: unknown): GenerationFailed =>
  GenerationFailed.make({ message: String(cause) });

export { GenerationFailed, failed };
