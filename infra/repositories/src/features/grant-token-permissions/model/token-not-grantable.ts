import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class TokenNotGrantable extends taggedError<
  TokenNotGrantable,
  { readonly brand: unique symbol }
>()("TokenNotGrantable", { reason: Schema.String }) {}
