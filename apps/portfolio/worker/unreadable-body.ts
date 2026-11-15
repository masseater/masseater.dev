import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class UnreadableBody extends taggedError<
  UnreadableBody,
  { readonly brand: unique symbol }
>()("UnreadableBody", { message: Schema.String }) {}
