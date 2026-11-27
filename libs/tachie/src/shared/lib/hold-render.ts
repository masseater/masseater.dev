import { Effect } from "effect";
import { cancelRender, continueRender, delayRender } from "remotion";

export const holdRender =
  (label: string) =>
  <Value, Failure, Needs>(
    effect: Effect.Effect<Value, Failure, Needs>,
  ): Effect.Effect<Value, Failure, Needs> =>
    Effect.suspend(() => {
      const handle = delayRender(label);
      return effect.pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            continueRender(handle);
          }),
        ),
        Effect.tapError((failure) =>
          Effect.sync(() => {
            cancelRender(failure);
          }),
        ),
      );
    });
