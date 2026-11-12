import { Effect, Schema } from "effect";

const taggedError = Schema.TaggedError;

class SyncFailed extends taggedError<SyncFailed, { readonly brand: unique symbol }>()(
  "SyncFailed",
  { message: Schema.String, signedOut: Schema.Boolean },
) {}

const syncFailed = (cause: unknown): SyncFailed =>
  SyncFailed.make({ message: globalThis.String(cause), signedOut: false });

const isSyncFailed = Schema.is(SyncFailed);

const failedWith = (cause: unknown): SyncFailed => {
  if (isSyncFailed(cause)) {
    return cause;
  }
  return syncFailed(cause);
};

const asSyncFailed = Effect.mapError(failedWith);

export { SyncFailed, asSyncFailed, syncFailed };
