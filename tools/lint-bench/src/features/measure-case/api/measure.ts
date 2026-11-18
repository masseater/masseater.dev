import {
  Array as Arr,
  Effect,
  FileSystem,
  Number as Num,
  Option,
  Path,
  Record as Rec,
  pipe,
} from "effect";

import type { Case, Context, Measurement } from "#/entities/bench/index.ts";

import { hyperfine } from "./hyperfine.ts";
import { sampleRun } from "./sample.ts";

const MAXIMUM_RUNS = 10;

const COLD_RUNS = 3;

const DROP_CACHES = "sync; echo 3 > /proc/sys/vm/drop_caches";

const HALF = 2;

const AT_LEAST_ONE = 1;

const NO_WARMUP = 0;

export type Settings = Readonly<{ budgetMillis: number; dropCaches: boolean }>;

export type Budget = Readonly<{ probeMillis: number; budgetMillis: number }>;

const write = Effect.fn(function* write(cwd: string, files: Readonly<Record<string, string>>) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = pipe(
    Rec.toEntries(files),
    Arr.map(([name, text]) => [path.join(cwd, name), text] as const),
  );
  yield* Effect.forEach(entries, ([file, text]) => fileSystem.writeFileString(file, text), {
    concurrency: "unbounded",
  });
  return pipe(
    entries,
    Arr.map(([file]) => file),
  );
});

const remove = Effect.fn(function* remove(written: readonly string[]) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* Effect.forEach(written, (file) => fileSystem.remove(file, { force: true }), {
    concurrency: "unbounded",
  }).pipe(Effect.ignore);
});

const removal = (directory: string): string => `rm -rf ${directory}`;

const removals = (caches: readonly string[]): readonly string[] => pipe(caches, Arr.map(removal));

const prepareOf = (caches: readonly string[], dropCaches: boolean): string =>
  pipe(
    Option.liftPredicate(DROP_CACHES, () => dropCaches),
    Option.toArray,
    Arr.appendAll(removals(caches)),
    Arr.append("true"),
    Arr.join("; "),
  );

export const planOf = ({
  probeMillis,
  budgetMillis,
}: Budget): Readonly<{ runs: number; warmup: number }> => {
  const fitting = Math.floor(budgetMillis / Math.max(probeMillis, AT_LEAST_ONE));
  return {
    runs: Num.clamp(fitting, { minimum: AT_LEAST_ONE, maximum: MAXIMUM_RUNS }),
    warmup: Number(probeMillis * HALF < budgetMillis),
  };
};

const keysOf = (benchCase: Case): Partial<Pick<Measurement, "keys">> =>
  pipe(
    Option.fromNullishOr(benchCase.keys),
    Option.match({ onNone: () => ({}), onSome: (keys) => ({ keys }) }),
  );

/** @internal */
export const measureCase = Effect.fn("measure.case")(function* measureCase(
  benchCase: Case,
  context: Context,
  settings: Settings,
) {
  const run = { command: benchCase.command(context), cwd: context.corpus };
  yield* Effect.acquireRelease(write(context.corpus, benchCase.files(context)), remove);
  const probe = yield* sampleRun(run);
  const { runs, warmup } = planOf({
    probeMillis: probe.millis,
    budgetMillis: settings.budgetMillis,
  });
  const warm = yield* hyperfine(run, { runs, warmup });
  const cold = yield* hyperfine(run, {
    runs: Math.min(runs, COLD_RUNS),
    warmup: NO_WARMUP,
    prepare: prepareOf(benchCase.caches(context), settings.dropCaches),
  });
  const found = benchCase.findings(probe.stdout);
  return {
    family: benchCase.family,
    tool: benchCase.tool,
    version: benchCase.version,
    own: benchCase.own,
    corpus: benchCase.corpus,
    scope: benchCase.scope,
    cold,
    warm,
    peakRssMegabytes: probe.peakRssMegabytes,
    findings: found.length,
    found,
    ...keysOf(benchCase),
  } satisfies Measurement;
}, Effect.scoped);
