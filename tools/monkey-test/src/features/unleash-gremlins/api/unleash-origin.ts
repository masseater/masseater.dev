import { Boolean as Bool, Effect, Option } from "effect";
import type { HttpClient } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";
import type { Browser } from "playwright";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import { browseOrigin } from "#/features/unleash-gremlins/api/browse-origin.ts";
import { serveDevServer } from "#/features/unleash-gremlins/api/serve-dev-server.ts";
import type { Target } from "#/features/unleash-gremlins/model/targets.ts";

const failed = (target: Target, message: string): readonly Finding[] => [
  findingOf({ kind: `${target.surface}-load`, target: target.origin, detail: message }),
];

const unleashed = Effect.fn("monkey.serve")(function* unleashed(
  input: Readonly<{ browser: Browser; target: Target }>,
) {
  const serving = yield* Option.match(input.target.serve, {
    onNone: () => Effect.succeed(true),
    onSome: serveDevServer,
  });
  return yield* Bool.match(serving, {
    onTrue: () => browseOrigin(input),
    onFalse: () => Effect.succeed(failed(input.target, "the dev server did not start")),
  });
});

const safely = (
  input: Readonly<{ browser: Browser; target: Target }>,
): Effect.Effect<
  readonly Finding[],
  never,
  ChildProcessSpawner.ChildProcessSpawner | HttpClient.HttpClient
> =>
  Effect.scoped(unleashed(input)).pipe(
    Effect.match({
      onFailure: ({ message }) => failed(input.target, message),
      onSuccess: (found): readonly Finding[] => found,
    }),
  );

/** @internal */
export const unleashOrigin = safely;
