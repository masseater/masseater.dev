import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ServerError extends taggedError<ServerError, { readonly brand: unique symbol }>()(
  "ServerError",
  { message: Schema.String },
) {}
