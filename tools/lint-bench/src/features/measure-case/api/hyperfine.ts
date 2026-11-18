import { Array as Arr, Effect, FileSystem, Option, Path, Schema, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { Timing } from "#/entities/bench/index.ts";

import type { Run } from "./sample.ts";

const Result = Schema.Struct({
  mean: Schema.Finite,
  stddev: Schema.NullOr(Schema.Finite),
  times: Schema.Array(Schema.Finite),
});

const Export = Schema.Struct({ results: Schema.Array(Result) });

const decodeExport = Schema.decodeEffect(Schema.fromJsonString(Export));

const MILLIS = 1000;

const NO_SPREAD = 0;

const NONE: Timing = { mean: 0, stddev: 0, runs: 0 };

export type Plan = Readonly<{ runs: number; warmup: number; prepare?: string }>;

const prepareOf = (plan: Plan): readonly string[] =>
  pipe(
    Option.fromNullishOr(plan.prepare),
    Option.match({ onNone: (): readonly string[] => [], onSome: (text) => ["--prepare", text] }),
  );

const timingOf = (result: typeof Result.Type): Timing => ({
  mean: result.mean * MILLIS,
  stddev: Option.getOrElse(Option.fromNullishOr(result.stddev), () => NO_SPREAD) * MILLIS,
  runs: result.times.length,
});

/** @internal */
export const hyperfine = Effect.fn("measure.hyperfine")(function* hyperfine(
  { command, cwd }: Run,
  plan: Plan,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fileSystem.makeTempDirectoryScoped();
  const exported = path.join(directory, "hyperfine.json");
  const options = [
    "--ignore-failure",
    "--shell=bash",
    "--style=none",
    `--warmup=${plan.warmup}`,
    `--runs=${plan.runs}`,
    ...prepareOf(plan),
    `--export-json=${exported}`,
    command,
  ];
  yield* spawner.string(ChildProcess.make("hyperfine", options, { cwd, extendEnv: true }));
  const text = yield* fileSystem.readFileString(exported);
  const decoded = yield* decodeExport(text);
  return pipe(
    Arr.head(decoded.results),
    Option.map(timingOf),
    Option.getOrElse(() => NONE),
  );
}, Effect.scoped);
