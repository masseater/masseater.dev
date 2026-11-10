import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { Cause, Effect, Option, Schema, pipe } from "effect";
import type { Stdio } from "effect";

import type { CommandServices } from "./command.ts";
import { VpToolsError } from "./errors.ts";
import { writeTo } from "./output.ts";

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

const runCli = <Failure>(program: Effect.Effect<void, Failure, CommandServices>): void => {
  runMain(program.pipe(Effect.tapCause(reportFailure), Effect.provide(nodeServicesLayer)), {
    disableErrorReporting: true,
  });
};

export { runCli };
