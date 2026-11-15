import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class GenerationFailed extends taggedError<
  GenerationFailed,
  { readonly brand: unique symbol }
>()("GenerationFailed", { message: Schema.String }) {}

export const failed = (cause: unknown): GenerationFailed =>
  GenerationFailed.make({ message: String(cause) });
