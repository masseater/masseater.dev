import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class AccessOAuthFailed extends taggedError<
  AccessOAuthFailed,
  { readonly brand: unique symbol }
>()("AccessOAuthFailed", { message: Schema.String, grantExpired: Schema.Boolean }) {}

export const failedWith = (message: string): AccessOAuthFailed =>
  AccessOAuthFailed.make({ message, grantExpired: false });

export const failed = (error: unknown): AccessOAuthFailed => failedWith(String(error));
