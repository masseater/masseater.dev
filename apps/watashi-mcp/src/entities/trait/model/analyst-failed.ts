import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class AnalystFailed extends taggedError<AnalystFailed, { readonly brand: unique symbol }>()(
  "AnalystFailed",
  { message: Schema.String },
) {}

export const analystFailed = (cause: unknown): AnalystFailed =>
  AnalystFailed.make({ message: String(cause) });
