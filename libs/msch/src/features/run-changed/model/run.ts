import { Array as Arr, Effect, Stdio, Stream, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { keepOnly } from "#/shared/lib/pass-records.ts";
import type { Records } from "#/shared/lib/pass-records.ts";

import { recordsOf } from "./records.ts";
import { unitsOf } from "./units.ts";
import type { Unit } from "./units.ts";

const SUCCESS = 0;
const LIST_SEPARATOR = ", ";
const ARGUMENT_SEPARATOR = " ";
const EVERYTHING = "everything";

const report = Effect.fn("report")(function* report(text: string) {
  const stdio = yield* Stdio.Stdio;
  yield* Stream.make(`msch-changed: ${text}\n`).pipe(Stream.run(stdio.stderr()), Effect.orDie);
});

const pathsOf = (units: readonly Unit[], changed: readonly Unit[]): readonly string[] => {
  if (changed.length === units.length) {
    return [];
  }
  return pipe(
    changed,
    Arr.flatMap(({ paths }) => paths),
  );
};

const namesOf = (units: readonly Unit[], changed: readonly Unit[]): string => {
  if (changed.length === units.length) {
    return EVERYTHING;
  }
  return pipe(
    changed,
    Arr.map(({ name }) => name),
    Arr.join(LIST_SEPARATOR),
  );
};

const exitCodeOf = Effect.fn("exitCodeOf")(function* exitCodeOf(
  root: string,
  [command, ...args]: readonly [string, ...string[]],
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const code = yield* spawner.exitCode(
    ChildProcess.make(command, args, {
      cwd: root,
      extendEnv: true,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  return Number(code);
});

const passedAll = (units: readonly Unit[]): readonly string[] =>
  pipe(
    units,
    Arr.map(({ key }) => key),
  );

interface Plan {
  readonly units: readonly Unit[];
  readonly changed: readonly Unit[];
  readonly records: Records;
}

const ran = Effect.fn("ran")(function* ran(
  root: string,
  command: readonly [string, ...string[]],
  plan: Plan,
) {
  const code = yield* exitCodeOf(root, [...command, ...pathsOf(plan.units, plan.changed)]);
  yield* Effect.when(
    keepOnly(plan.records, passedAll(plan.units)),
    Effect.succeed(code === SUCCESS),
  );
  return code;
});

/** @internal */
export const runChanged = Effect.fn("runChanged")(function* runChanged(
  root: string,
  command: readonly [string, ...string[]],
) {
  const units = yield* unitsOf(root);
  const records = yield* recordsOf(root, command);
  const changed = pipe(
    units,
    Arr.filter(({ key }) => !Arr.contains(records.passed, key)),
  );
  const since = `since \`${Arr.join(command, ARGUMENT_SEPARATOR)}\` last passed`;
  if (!Arr.isReadonlyArrayNonEmpty(changed)) {
    yield* report(`nothing changed ${since}`);
    return SUCCESS;
  }
  yield* report(
    `${String(changed.length)} of ${String(units.length)} changed ${since}: ${namesOf(units, changed)}`,
  );
  return yield* ran(root, command, { units, changed, records });
});
