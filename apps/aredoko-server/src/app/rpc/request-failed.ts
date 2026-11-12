import { RequestFailed, failed } from "@masseater.dev/local-server";
import { Array, Effect, pipe } from "effect";

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

export { firstOr };
