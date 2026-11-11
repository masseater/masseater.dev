import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class AccessOAuthFailed extends taggedError<AccessOAuthFailed, { readonly brand: unique symbol }>()(
  "AccessOAuthFailed",
  { message: Schema.String, grantExpired: Schema.Boolean },
) {}

const failedWith = (message: string): AccessOAuthFailed =>
  AccessOAuthFailed.make({ message, grantExpired: false });

const failed = (error: unknown): AccessOAuthFailed => failedWith(String(error));

export { AccessOAuthFailed, failed, failedWith };
