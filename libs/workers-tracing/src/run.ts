import { Effect, Layer, ManagedRuntime, Option, pipe } from "effect";

import { failures } from "./failure.ts";

type Run<Services> = <Success, Failure>(
  effect: Effect.Effect<Success, Failure, Services>,
) => Promise<Success>;

type Runner = <Services, LayerError>(services: Layer.Layer<Services, LayerError>) => Run<Services>;

const runnerWith =
  (tracing: Layer.Layer<never>): Runner =>
  (services) => {
    const runtime = ManagedRuntime.make(Layer.mergeAll(services, tracing));
    return (effect) =>
      runtime.runPromise(
        effect.pipe(
          Effect.tapCause((cause) =>
            pipe(
              failures(cause),
              Option.match({
                onNone: () => Effect.void,
                onSome: (failed) => Effect.logError("request failed", failed),
              }),
            ),
          ),
        ),
      );
  };

export type { Run, Runner };
export { runnerWith };
