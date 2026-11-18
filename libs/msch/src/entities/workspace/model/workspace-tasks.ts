import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { Manifest } from "#/entities/package/@x/workspace.ts";

import { nestedValues } from "./config-literal.ts";
import { settingsInvalid } from "./workspace-config-source.ts";

export const VERIFY_TASK = ["tasks", "verify"] as const;

export const TEST_TASK = ["tasks", "test"] as const;

const NATIVE_TASK = ["tasks", "native"] as const;

export const RUN_TASKS = ["run", "tasks"] as const;

export interface WorkspaceTasks {
  readonly verify: readonly string[];
  readonly native: readonly string[];
}

export const NO_TASKS: WorkspaceTasks = { verify: [], native: [] };

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

const distributesArchive = (manifest: Manifest): boolean =>
  pipe(
    Option.fromUndefinedOr(manifest.native),
    Option.flatMap((native) => Option.fromUndefinedOr(native.archive)),
    Option.getOrElse(() => false),
  );

const namedTasks =
  (program: unknown, manifest: Manifest) =>
  (name: string): WorkspaceTasks => ({
    verify: Arr.getSomes([
      Option.liftPredicate(`${name}#verify`, () => definesTask(VERIFY_TASK)(program)),
      Option.liftPredicate(`${name}#test`, () => definesTask(TEST_TASK)(program)),
    ]),
    native: Arr.filter(
      [`${name}#native`],
      () => definesTask(NATIVE_TASK)(program) && !distributesArchive(manifest),
    ),
  });

export const tasksOf =
  (manifest: Option.Option<Manifest>) =>
  (program: unknown): WorkspaceTasks =>
    pipe(
      manifest,
      Option.flatMap((found) =>
        Option.map(Option.fromUndefinedOr(found.name), namedTasks(program, found)),
      ),
      Option.getOrElse(() => NO_TASKS),
    );
