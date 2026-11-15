import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class JudgeError extends taggedError<JudgeError, { readonly brand: unique symbol }>()(
  "JudgeError",
  {
    reason: Schema.String,
  },
) {}
