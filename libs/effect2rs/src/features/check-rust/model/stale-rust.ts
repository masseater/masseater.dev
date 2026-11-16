import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class StaleRust extends taggedError<StaleRust, { readonly brand: unique symbol }>()(
  "StaleRust",
  { path: Schema.String, message: Schema.String },
) {}

export const staleRust = (path: string): StaleRust =>
  StaleRust.make({
    path,
    message: `${path} does not match the Effect Schema. Generate it again with effect2rs.`,
  });
