import { Console, Effect, Option, Path } from "effect";

import { withCollector } from "#/features/record-lap/api/collector.ts";
import { appendLine, keepSummary, lapDirectory } from "#/features/record-lap/api/files.ts";
import { runCommand } from "#/features/record-lap/api/run.ts";
import { invocationOf } from "#/features/record-lap/model/arguments.ts";
import type { Invocation } from "#/features/record-lap/model/arguments.ts";
import { lapLine } from "#/features/record-lap/model/span.ts";
import type { Lap } from "#/features/record-lap/model/span.ts";

const ARGUMENTS_FROM = 2;
const USAGE_EXIT = 2;
const REPOSITORY_ROOT = ["..", "..", "..", ".."];
const COLLECTOR_CONFIG = [".github", "actions", "setup", "otelcol.yaml"];

const setExitCode = (exitCode: number): Effect.Effect<void> =>
  Effect.sync(() => {
    process.exitCode = exitCode;
  });

const record = Effect.fn("lap.record")(function* record(directory: string, finished: Lap) {
  const path = yield* Path.Path;
  const line = yield* lapLine(finished);
  yield* appendLine(path.join(directory, "traces.jsonl"), line);
  yield* keepSummary(directory).pipe(Effect.ignore);
});

const timed = Effect.fn("lap.timed")(function* timed(invocation: Invocation) {
  const path = yield* Path.Path;
  const directory = yield* lapDirectory(invocation.name);
  const config = path.resolve(import.meta.dirname, ...REPOSITORY_ROOT, ...COLLECTOR_CONFIG);
  const run = runCommand(invocation.command);
  const timing = yield* withCollector({ directory, config }, run);
  yield* record(directory, { ...invocation, ...timing });
  return timing.exitCode;
});

const usage = Console.error("usage: lap <name> -- <command> [args]").pipe(Effect.as(USAGE_EXIT));

/** @internal */
export const lap = invocationOf(process.argv.slice(ARGUMENTS_FROM)).pipe(
  Option.match({ onNone: () => usage, onSome: timed }),
  Effect.flatMap(setExitCode),
);
