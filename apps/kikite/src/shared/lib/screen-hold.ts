import { Effect, Schema, Stream, pipe } from "effect";
import type { Scope } from "effect";

const taggedError = Schema.TaggedError;

class ScreenLockRefused extends taggedError<ScreenLockRefused, { readonly brand: unique symbol }>()(
  "ScreenLockRefused",
  { message: Schema.String },
) {}

const refused = (cause: unknown): ScreenLockRefused =>
  ScreenLockRefused.make({ message: String(cause) });

const lockScreen = Effect.acquireRelease(
  Effect.tryPromise({ try: () => navigator.wakeLock.request("screen"), catch: refused }),
  (sentinel) => Effect.ignore(Effect.tryPromise({ try: () => sentinel.release(), catch: refused })),
);

const becameVisible = pipe(
  Stream.fromEventListener(document, "visibilitychange"),
  Stream.filter(() => document.visibilityState === "visible"),
);

const holding = pipe(
  Stream.concat(Stream.make(true), becameVisible),
  Stream.runForEach(() => Effect.ignore(lockScreen)),
);

const holdScreen: Effect.Effect<void, never, Scope.Scope> = Effect.when(
  Effect.asVoid(Effect.forkScoped(holding)),
  Effect.sync(() => "wakeLock" in navigator),
).pipe(Effect.asVoid);

export { holdScreen };
