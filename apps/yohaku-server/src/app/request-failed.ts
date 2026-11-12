import { RequestFailed } from "@masseater.dev/yohaku-protocol";
import { Cause, Effect, Option, Schema, Stream } from "effect";

const NOT_FOUND = "見つかりません";

const asRequestFailed = (problem: unknown): RequestFailed => {
  if (Schema.is(RequestFailed)(problem)) {
    return problem;
  }
  return RequestFailed.make({ reason: "Failed", message: Cause.pretty(Cause.fail(problem)) });
};

const failed = <Value, Failure, Requirements>(
  effect: Effect.Effect<Value, Failure, Requirements>,
): Effect.Effect<Value, RequestFailed, Requirements> =>
  effect.pipe(
    Effect.tapError((problem) => Effect.logError("request failed", problem)),
    Effect.mapError(asRequestFailed),
  );

const found = <Value, Failure, Requirements>(
  effect: Effect.Effect<Option.Option<Value>, Failure, Requirements>,
): Effect.Effect<Value, RequestFailed, Requirements> =>
  failed(effect).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(RequestFailed.make({ reason: "NotFound", message: NOT_FOUND })),
        onSome: Effect.succeed,
      }),
    ),
  );

const failedStream = <Value, Failure, Requirements>(
  stream: Stream.Stream<Value, Failure, Requirements>,
): Stream.Stream<Value, RequestFailed, Requirements> =>
  stream.pipe(Stream.mapError(asRequestFailed));

export { failed, failedStream, found };
