import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class LockfileUnreadable extends taggedError<
  LockfileUnreadable,
  { readonly brand: unique symbol }
>()("LockfileUnreadable", { root: Schema.String, reason: Schema.String }) {}
