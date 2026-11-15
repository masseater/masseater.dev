import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class BlendUnreadable extends taggedError<
  BlendUnreadable,
  { readonly brand: unique symbol }
>()("BlendUnreadable", { path: Schema.String, cause: Schema.Defect() }) {}
