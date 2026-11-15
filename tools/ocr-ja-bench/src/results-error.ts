import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ResultsError extends taggedError<ResultsError, { readonly brand: unique symbol }>()(
  "ResultsError",
  {
    reason: Schema.String,
  },
) {}
