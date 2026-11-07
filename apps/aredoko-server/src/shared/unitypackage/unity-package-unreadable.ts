import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class UnityPackageUnreadable extends taggedError<
  UnityPackageUnreadable,
  { readonly brand: unique symbol }
>()("UnityPackageUnreadable", { path: Schema.String, cause: Schema.Defect() }) {}

export { UnityPackageUnreadable };
