import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class IntakeFailed extends taggedError<IntakeFailed, { readonly brand: unique symbol }>()(
  "IntakeFailed",
  { cause: Schema.Defect() },
) {}
