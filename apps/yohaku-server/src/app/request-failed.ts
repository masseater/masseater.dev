import { RequestFailed, asRequestFailed, failed } from "@masseater.dev/local-server";
import { Effect, Option, Stream } from "effect";

const NOT_FOUND = "見つかりません";

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

export { failedStream, found };
