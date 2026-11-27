import { Array as Arr, Effect, Option, Stdio, Stream, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { keepOnly } from "#/shared/lib/pass-records.ts";
import type { Records } from "#/shared/lib/pass-records.ts";

import { batchesOf } from "./batches.ts";
import type { Invocation } from "./invocation.ts";
import { recordsOf } from "./records.ts";
import { unitsOf } from "./units.ts";
import type { Unit } from "./units.ts";

const SUCCESS = 0;
const LIST_SEPARATOR = ", ";
const ARGUMENT_SEPARATOR = " ";
const EVERYTHING = "everything";
const SINGLE_BATCH = 1;

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

interface Plan {
  readonly root: string;
  readonly command: readonly [string, ...string[]];
  readonly units: readonly Unit[];
  readonly changed: readonly Unit[];
}

const keyOf = ({ key }: Unit): string => key;

const keysAfter = (plan: Plan, records: Records, batch: readonly Unit[]): readonly string[] => {
  const current = pipe(plan.units, Arr.map(keyOf));
  const kept = pipe(
    records.passed,
    Arr.filter((key) => Arr.contains(current, key)),
  );
  return Arr.dedupe([...kept, ...pipe(batch, Arr.map(keyOf))]);
};

const ranBatch = Effect.fn("ranBatch")(function* ranBatch(plan: Plan, batch: readonly Unit[]) {
  const code = yield* exitCodeOf(plan.root, [...plan.command, ...pathsOf(plan.units, batch)]);
  const records = yield* recordsOf(plan.root, plan.command);
  const keys = keysAfter(plan, records, batch);
  yield* Effect.when(keepOnly(records, keys), Effect.succeed(code === SUCCESS));
  return code;
});

const ran = Effect.fn("ran")(function* ran(plan: Plan, batchSources: number) {
  const batches = batchesOf(plan.changed, batchSources);
  yield* Effect.when(
    report(`${String(batches.length)} batches of at most ${String(batchSources)} source files`),
    Effect.succeed(batches.length > SINGLE_BATCH),
  );
  const codes = yield* Effect.forEach(batches, (batch) => ranBatch(plan, batch), {
    concurrency: 1,
  });
  return pipe(
    codes,
    Arr.findFirst((code) => code !== SUCCESS),
    Option.getOrElse(() => SUCCESS),
  );
});

/** @internal */
export const runChanged = Effect.fn("runChanged")(function* runChanged(
  root: string,
  { command, batchSources }: Invocation,
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
  return yield* ran({ root, command, units, changed }, batchSources);
});
