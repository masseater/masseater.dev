import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class OpenFailed extends taggedError<OpenFailed, { readonly brand: unique symbol }>()(
  "OpenFailed",
  { message: Schema.String, cause: Schema.Defect() },
) {}

export { OpenFailed };
