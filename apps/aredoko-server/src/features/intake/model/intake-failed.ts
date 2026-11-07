import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class IntakeFailed extends taggedError<IntakeFailed, { readonly brand: unique symbol }>()(
  "IntakeFailed",
  { cause: Schema.Defect() },
) {}

export { IntakeFailed };
