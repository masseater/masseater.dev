import { runMain } from "@effect/platform-node-shared/NodeRuntime";
import { Cause, Effect, Layer, Option, Schema, pipe } from "effect";
import type { Stdio } from "effect";

import type { CommandServices } from "./command.ts";
import { VpToolsError } from "./errors.ts";
import { nodeServicesLayer } from "./node-services.ts";
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
  const main = Layer.build(nodeServicesLayer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.tapCause(reportFailure)), context),
    ),
    Effect.scoped,
  );
  runMain(main, { disableErrorReporting: true });
};

/** @internal */
export { runCli };
