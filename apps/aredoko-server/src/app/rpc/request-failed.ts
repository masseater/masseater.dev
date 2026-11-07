import { RequestFailed } from "@masseater.dev/aredoko-protocol";
import { Array, Cause, Effect, Option, Schema, pipe } from "effect";

const isRequestFailed = Schema.is(RequestFailed);

const failure = (error: unknown): RequestFailed =>
  pipe(
    Option.liftPredicate(error, isRequestFailed),
    Option.getOrElse(() =>
      RequestFailed.make({ reason: "Failed", message: Cause.pretty(Cause.fail(error)) }),
    ),
  );

const failed = <Value, Failure, Requirements>(
  effect: Effect.Effect<Value, Failure, Requirements>,
): Effect.Effect<Value, RequestFailed, Requirements> =>
  effect.pipe(
    Effect.tapError((problem) => Effect.logError("request failed", problem)),
    Effect.mapError(failure),
  );

const firstOr =
  (message: string) =>
  <Value, Failure, Requirements>(
    effect: Effect.Effect<readonly Value[], Failure, Requirements>,
  ): Effect.Effect<Value, RequestFailed, Requirements> =>
    failed(effect).pipe(
      Effect.flatMap((items) =>
        pipe(
          Array.head(items),
          Effect.fromOption,
          Effect.mapError(() => RequestFailed.make({ reason: "NotFound", message })),
        ),
      ),
    );

export { failed, firstOr };
