import { Array as Arr, Effect, pipe } from "effect";

import type { Finding } from "#/entities/finding/index.ts";
import { unleashOrigin } from "#/features/unleash-gremlins/api/unleash-origin.ts";
import type { Target } from "#/features/unleash-gremlins/model/targets.ts";
import { launchBrowser } from "#/shared/lib/browser.ts";

const CONCURRENCY = 3;

const unleashAll = Effect.fn("monkey.gremlins")(function* unleashAll(targets: readonly Target[]) {
  const browser = yield* launchBrowser;
  const found = yield* Effect.forEach(targets, (target) => unleashOrigin({ browser, target }), {
    concurrency: CONCURRENCY,
  });
  return pipe(found, Arr.flatten);
});

/** @internal */
export const unleashGremlins = (targets: readonly Target[]): Effect.Effect<readonly Finding[]> =>
  Effect.scoped(unleashAll(targets));
