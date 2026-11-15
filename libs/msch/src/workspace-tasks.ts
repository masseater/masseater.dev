import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { nestedValues } from "./config-literal.ts";
import type { Manifest } from "./dependencies.ts";
import { settingsInvalid } from "./workspace-config-source.ts";

const VERIFY_TASK = ["tasks", "verify"] as const;
const BUILD_TASK = ["tasks", "build"] as const;
const DIST_PREFIX = "./dist/";

interface WorkspaceTasks {
  readonly verify: readonly string[];
  readonly builtExports: readonly string[];
}

const NO_TASKS: WorkspaceTasks = { verify: [], builtExports: [] };

const Tasks = Schema.Struct({ verify: Schema.Unknown });
const isVerified = Schema.is(Schema.Struct({ run: Schema.Struct({ tasks: Tasks }) }));

const definesTask =
  (path: readonly [string, string]) =>
  (program: unknown): boolean =>
    Arr.isReadonlyArrayNonEmpty(nestedValues(path)(program));

const hasVerifyTask = Effect.fn("hasVerifyTask")(function* hasVerifyTask(file: string) {
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => settingsInvalid(file)("vite.config.ts does not load."),
  }).pipe(Effect.option);
  return Option.exists(config, isVerified);
});

const pointsIntoDist = (held: unknown): boolean => {
  if (Predicate.isString(held)) {
    return Str.startsWith(DIST_PREFIX)(held);
  }
  if (Predicate.isObject(held)) {
    return Arr.some(Rec.values(held), pointsIntoDist);
  }
  return false;
};

const tasksOf =
  (manifest: Option.Option<Manifest>) =>
  (program: unknown): WorkspaceTasks =>
    pipe(
      manifest,
      Option.flatMap((found) =>
        Option.map(Option.fromUndefinedOr(found.name), (name) => ({ name, found })),
      ),
      Option.match({
        onNone: () => NO_TASKS,
        onSome: ({ name, found }) => ({
          verify: Arr.filter([`${name}#verify`], () => definesTask(VERIFY_TASK)(program)),
          builtExports: Arr.filter(
            [`${name}#build`],
            () => pointsIntoDist(found.exports) && definesTask(BUILD_TASK)(program),
          ),
        }),
      }),
    );

export { NO_TASKS, VERIFY_TASK, definesTask, hasVerifyTask, tasksOf };
export type { WorkspaceTasks };
