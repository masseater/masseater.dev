import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class AnalystFailed extends taggedError<AnalystFailed, { readonly brand: unique symbol }>()(
  "AnalystFailed",
  { message: Schema.String },
) {}

const analystFailed = (cause: unknown): AnalystFailed =>
  AnalystFailed.make({ message: String(cause) });

export { AnalystFailed, analystFailed };
