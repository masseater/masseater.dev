import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { Manifest } from "#/entities/package/@x/workspace.ts";

import { nestedValues } from "./config-literal.ts";
import { settingsInvalid } from "./workspace-config-source.ts";

export const VERIFY_TASK = ["tasks", "verify"] as const;
export const RUN_TASKS = ["run", "tasks"] as const;

export interface WorkspaceTasks {
  readonly verify: readonly string[];
}

export const NO_TASKS: WorkspaceTasks = { verify: [] };

const Tasks = Schema.Struct({ verify: Schema.Unknown });
const isVerified = Schema.is(Schema.Struct({ run: Schema.Struct({ tasks: Tasks }) }));

export const definesTask =
  (path: readonly [string, string]) =>
  (program: unknown): boolean =>
    Arr.isReadonlyArrayNonEmpty(nestedValues(path)(program));

export const hasVerifyTask = Effect.fn("hasVerifyTask")(function* hasVerifyTask(file: string) {
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => settingsInvalid(file)("vite.config.ts does not load."),
  }).pipe(Effect.option);
  return Option.exists(config, isVerified);
});

export const tasksOf =
  (manifest: Option.Option<Manifest>) =>
  (program: unknown): WorkspaceTasks =>
    pipe(
      manifest,
      Option.flatMap((found) => Option.fromUndefinedOr(found.name)),
      Option.match({
        onNone: () => NO_TASKS,
        onSome: (name) => ({
          verify: Arr.filter([`${name}#verify`], () => definesTask(VERIFY_TASK)(program)),
        }),
      }),
    );
