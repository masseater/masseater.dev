import { runMain } from "@effect/platform-node-shared/NodeRuntime";
import { Cause, Effect, Layer, Option, Schema, pipe } from "effect";
import type { Stdio } from "effect";

import type { CommandServices } from "#/shared/lib/command.ts";
import { VpToolsError } from "#/shared/lib/errors.ts";
import { nodeServicesLayer } from "#/shared/lib/node-services.ts";
import { writeTo } from "#/shared/lib/output.ts";

const reportFailure = <Failure>(
  cause: Cause.Cause<Failure>,
): Effect.Effect<void, never, Stdio.Stdio> => {
  const message = pipe(
    Cause.findErrorOption(cause),
    Option.filter(Schema.is(VpToolsError)),
    Option.match({
      onNone: () => Cause.pretty(cause),
      onSome: (error) => error.message,
    }),
  );
  return writeTo("stderr", `${message}\n`);
};

/** @internal */
export const runCli = <Failure>(program: Effect.Effect<void, Failure, CommandServices>): void => {
  const reported = program.pipe(Effect.tapCause(reportFailure));
  const main = Layer.build(nodeServicesLayer).pipe(
    Effect.flatMap((services) => Effect.provideContext(reported, services)),
    Effect.scoped,
  );
  runMain(main, { disableErrorReporting: true });
};
