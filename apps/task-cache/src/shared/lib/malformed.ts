import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class Malformed extends taggedError<Malformed, { readonly brand: unique symbol }>()(
  "Malformed",
  { reason: Schema.String },
) {}

export const malformed = (cause: unknown): Malformed =>
  Malformed.make({ reason: globalThis.String(cause) });
