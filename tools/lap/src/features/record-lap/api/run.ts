import { Clock, Effect } from "effect";
import { ChildProcess } from "effect/process";

import { ENDPOINT } from "#/shared/config/endpoint.ts";

/** @internal */
export const runCommand = Effect.fn("lap.run")(function* runCommand(
  command: readonly [string, ...string[]],
) {
  const [program, ...args] = command;
  const startMillis = yield* Clock.currentTimeMillis;
  const handle = yield* ChildProcess.make(program, args, {
    env: { OTEL_TRACES_EXPORTER: "otlp", OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT },
    extendEnv: true,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = yield* handle.exitCode;
  const endMillis = yield* Clock.currentTimeMillis;
  return { startMillis, endMillis, exitCode: Number(exitCode) };
}, Effect.scoped);
