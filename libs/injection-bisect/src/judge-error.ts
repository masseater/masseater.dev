import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class JudgeError extends taggedError<JudgeError, { readonly brand: unique symbol }>()(
  "JudgeError",
  {
    reason: Schema.String,
  },
) {}

export { JudgeError };
