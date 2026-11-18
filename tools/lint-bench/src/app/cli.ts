import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

import { betterleaks } from "@r_masseater/h56m-presets";
import {
  Array as Arr,
  Console,
  DateTime,
  Effect,
  FileSystem,
  Match,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { Command, Flag } from "effect/cli";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { Case, Context, Family } from "#/entities/bench/index.ts";
import {
  markdownCases,
  markdownConfig,
  secretCases,
  structureCases,
  structureConfig,
  workflowCases,
} from "#/features/define-cases/index.ts";
import { measureCase } from "#/features/measure-case/index.ts";
import { NODE_COMMIT, installNpmTools, prepareCorpora } from "#/features/prepare-corpora/index.ts";
import type { Corpus } from "#/features/prepare-corpora/index.ts";
import { rowsOf, sectionOf } from "#/features/report-results/index.ts";

const FAMILIES: readonly Family[] = ["markdown", "structure", "workflows", "secrets"];

const CASES: readonly Case[] = [
  ...markdownCases,
  ...structureCases,
  ...workflowCases,
  ...secretCases,
];

const TITLES: Readonly<Record<Family, string>> = {
  markdown: "Markdown (y8)",
  structure: "Structure and dependencies (wism)",
  workflows: "GitHub Actions (fu4)",
  secrets: "Secrets (h56m)",
};

const MILLIS = 1000;

const SUCCESS = 0;

const ANY_COUNT = 0;

const DEFAULT_BUDGET_SECONDS = 60;

const Meta = Schema.Struct({
  measuredAt: Schema.String,
  machine: Schema.String,
  ownCommit: Schema.String,
  nodeCommit: Schema.String,
  pageCacheDropped: Schema.Boolean,
});

const Results = Schema.Struct({ meta: Meta, rows: Schema.Array(Schema.Unknown) });

const encodeResults = Schema.encodeEffect(Schema.fromJsonString(Results));

type Corpora = Readonly<{ own: Corpus; node: Corpus; repository: Corpus }>;

type Report = Readonly<{ meta: typeof Meta.Type; rows: ReturnType<typeof rowsOf> }>;

type Input = Readonly<{ family: readonly string[]; budget: number; out: string }>;

const pathOf = (specifier: string): string => fileURLToPath(import.meta.resolve(specifier));

const LINTERS = ["y8", "wism", "fu4", "h56m"];

const binsOf = (path: Path.Path, repository: string): Readonly<Record<string, string>> =>
  pipe(
    LINTERS,
    Arr.map((name): readonly [string, string] => [
      name,
      path.join(repository, "libs", name, "bin", `${name}.ts`),
    ]),
    Rec.fromEntries,
  );

const canDropCaches = Effect.gen(function* canDrop() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const code = yield* spawner.exitCode(
    ChildProcess.make("bash", ["-c", "sync; echo 3 > /proc/sys/vm/drop_caches"]),
  );
  return code === SUCCESS;
}).pipe(Effect.orElseSucceed(() => false));

const repositoryOf = Effect.gen(function* repository() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const output = yield* spawner.string(ChildProcess.make("git", ["rev-parse", "--show-toplevel"]));
  return Str.trim(output);
});

const corpusOf =
  (corpora: Corpora) =>
  (benchCase: Case): Corpus =>
    Match.value(benchCase).pipe(
      Match.when({ repositoryRoot: true }, () => corpora.repository),
      Match.when({ corpus: "nodejs/node" }, () => corpora.node),
      Match.orElse(() => corpora.own),
    );

const chosenBy =
  (families: readonly string[]) =>
  (benchCase: Case): boolean =>
    Arr.isReadonlyArrayEmpty(families) || Arr.contains(families, benchCase.family);

const coldNote = (dropCaches: boolean): string =>
  Match.value(dropCaches).pipe(
    Match.when(true, () => "drop the page cache and the tools' caches"),
    Match.orElse(() => "drop the tools' caches"),
  );

const reportOf = ({ meta, rows }: Report): string =>
  pipe(
    FAMILIES,
    Arr.filter((family) =>
      pipe(
        rows,
        Arr.some((row) => row.family === family),
      ),
    ),
    Arr.map((family) => `## ${TITLES[family]}\n\n${sectionOf(rows)(family)}`),
    Arr.join("\n\n"),
    (body) =>
      `# Lint benchmark\n\nMeasured ${meta.measuredAt} on ${meta.machine}. masseater.dev at ${meta.ownCommit}, nodejs/node at ${meta.nodeCommit}. Cold runs ${coldNote(meta.pageCacheDropped)} first.\n\n${body}\n`,
  );

type Setup = Readonly<{
  corpora: Corpora;
  npm: string;
  config: Readonly<Record<string, string>>;
  dropCaches: boolean;
  bins: Readonly<Record<string, string>>;
}>;

const setup = Effect.fn("lint-bench.setup")(function* setup() {
  const path = yield* Path.Path;
  const repository = yield* repositoryOf;
  const cache = path.join(homedir(), ".cache", "lint-bench");
  const corpora = yield* prepareCorpora(repository, cache);
  const tools = yield* installNpmTools(cache, { ...markdownConfig, ...structureConfig });
  const dropCaches = yield* canDropCaches;
  const config = {
    ...tools.config,
    "fu4-presets": path.join(repository, "libs", "fu4-presets", "src", "app", "index.ts"),
    "h56m-presets": pathOf("@r_masseater/h56m-presets"),
    "betterleaks.toml": betterleaks,
  };
  return {
    corpora,
    npm: tools.npm,
    config,
    dropCaches,
    bins: binsOf(path, repository),
  } satisfies Setup;
});

const measureOne = Effect.fn("lint-bench.case")(function* measureOne(
  prepared: Setup,
  budget: number,
  benchCase: Case,
) {
  const corpus = corpusOf(prepared.corpora)(benchCase);
  const context: Context = {
    corpus: corpus.root,
    base: corpus.base,
    npm: prepared.npm,
    bins: prepared.bins,
    config: prepared.config,
  };
  yield* Console.log(`${benchCase.family} ${benchCase.corpus} ${benchCase.tool}`);
  return yield* measureCase(benchCase, context, {
    budgetMillis: budget * MILLIS,
    dropCaches: prepared.dropCaches,
  });
});

const metaOf = Effect.fn("lint-bench.meta")(function* metaOf(prepared: Setup) {
  const now = yield* DateTime.now;
  return {
    measuredAt: DateTime.formatIso(now),
    machine: `${process.platform} ${process.arch}, ${navigator.hardwareConcurrency} CPUs`,
    ownCommit: prepared.corpora.own.commit,
    nodeCommit: NODE_COMMIT,
    pageCacheDropped: prepared.dropCaches,
  };
});

const writeResults = Effect.fn("lint-bench.write")(function* writeResults(
  directory: string,
  results: Report,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const out = path.resolve(directory);
  const json = yield* encodeResults(results);
  const markdown = reportOf(results);
  yield* fileSystem.makeDirectory(out, { recursive: true });
  yield* fileSystem.writeFileString(path.join(out, "results.json"), json);
  yield* fileSystem.writeFileString(path.join(out, "results.md"), markdown);
  yield* Console.log(markdown);
});

const run = Effect.fn("lint-bench.run")(function* run(input: Input) {
  const prepared = yield* setup();
  const chosen = pipe(CASES, Arr.filter(chosenBy(input.family)));
  const measurements = yield* Effect.forEach(
    chosen,
    (benchCase) => measureOne(prepared, input.budget, benchCase),
    { concurrency: 1 },
  );
  const meta = yield* metaOf(prepared);
  yield* writeResults(input.out, { meta, rows: rowsOf(measurements) });
});

/** @internal */
export const cli = Command.make(
  "lint-bench",
  {
    family: Flag.String("family").pipe(Flag.atLeast(ANY_COUNT)),
    budget: Flag.Int("budget").pipe(Flag.withDefault(DEFAULT_BUDGET_SECONDS)),
    out: Flag.String("out").pipe(Flag.withDefault("results")),
  },
  run,
);
