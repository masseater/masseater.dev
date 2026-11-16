import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import {
  nestedValues,
  RUN_TASKS,
  stringsIn,
  workspaceConfigOf,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { FoundString } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const OUTSIDE_BIN: RuleName = "command-outside-bin";
const UNRUN: RuleName = "unrun-command";
const SCRIPTS: RuleName = "scripts-directory";
const BIN = "bin";
const SCRIPTS_DIRECTORY = "scripts";
const WORKFLOW_DIRECTORY = ".github/";
const SEPARATOR = "/";
const CURRENT = "./";
const READ_CONCURRENCY = 8;
const FIRST = 1;
const RUN_FILE =
  /(?:^|[\s;&|(])(?:node|vpx|tsx|bun|deno)\s+(?:-\S+\s+)*(?<file>[^\s;&|)]+\.[cm]?[jt]s)\b/gu;
const COMMAND = /^bin\/[^/]+\.[cm]?ts$/u;
const NOT_COMMAND = /\.(?:test|d|test\.support)\.[cm]?ts$/u;

const Manifest = Schema.Struct({
  bin: Schema.optional(Schema.Unknown),
  main: Schema.optional(Schema.Unknown),
  exports: Schema.optional(Schema.Unknown),
});
const TargetMap = Schema.Record(Schema.String, Schema.Unknown);

const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));
const decodeTarget = Schema.decodeUnknownOption(Schema.String);
const decodeTargetMap = Schema.decodeUnknownOption(TargetMap);

interface CommandRun {
  readonly path: string;
  readonly start: number;
}

interface Entries {
  readonly all: readonly string[];
  readonly bins: readonly string[];
}

const NO_ENTRIES: Entries = { all: [], bins: [] };

const withoutCurrent = (path: string): string =>
  Str.replace(new RegExp(`^${CURRENT}`, "u"), "")(path);

const runsIn = ({ text, start }: FoundString): readonly CommandRun[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(RUN_FILE)(text)),
    Arr.flatMap((found) =>
      pipe(
        Option.fromUndefinedOr(found.groups),
        Option.flatMap(Rec.get("file")),
        Option.map((path) => ({ path: withoutCurrent(path), start })),
        Option.toArray,
      ),
    ),
  );

const targetsIn = (held: unknown): readonly string[] => [
  ...pipe(decodeTarget(held), Option.map(withoutCurrent), Option.toArray),
  ...pipe(
    decodeTargetMap(held),
    Option.map(Rec.values),
    Option.getOrElse((): readonly unknown[] => []),
    Arr.flatMap(targetsIn),
  ),
];

const entriesOf = (manifest: typeof Manifest.Type): Entries => {
  const bins = targetsIn(manifest.bin);
  return { all: [...bins, ...targetsIn(manifest.main), ...targetsIn(manifest.exports)], bins };
};

const declaredEntries = Effect.fn("declaredEntries")(function* declaredEntries(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, directory, MANIFEST_FILE));
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.map(entriesOf),
    Option.getOrElse(() => NO_ENTRIES),
  );
});

const isCommand = (path: string): boolean => COMMAND.test(path) && !NOT_COMMAND.test(path);

const commandFilesIn = Effect.fn("commandFilesIn")(function* commandFilesIn(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const names = yield* files.readDirectory(files.join(root, directory, BIN));
  return pipe(
    names,
    Arr.map((name) => `${BIN}${SEPARATOR}${name}`),
    Arr.filter(isCommand),
  );
});

const workflowText = Effect.fn("workflowText")(function* workflowText(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const workflows = pipe(listed, Arr.filter(Str.startsWith(WORKFLOW_DIRECTORY)));
  const texts = yield* Effect.forEach(workflows, (file) => files.readFile(files.join(root, file)), {
    concurrency: READ_CONCURRENCY,
  });
  return pipe(Arr.getSomes(texts), Arr.join("\n"));
});

const workspacePath = (directory: string, path: string): string =>
  pipe([directory, path], Arr.filter(Str.isNonEmpty), Arr.join(SEPARATOR));

interface OutsideInput {
  readonly file: string;
  readonly source: string;
  readonly runs: readonly CommandRun[];
  readonly entries: Entries;
}

const outsideProblems = ({ file, source, runs, entries }: OutsideInput): readonly Problem[] =>
  pipe(
    runs,
    Arr.filter(({ path }) => !COMMAND.test(path) && !Arr.contains(entries.all, path)),
    Arr.map(({ path, start }): Problem => ({
      file,
      ...positionOf(source)(start),
      rule: OUTSIDE_BIN,
      message: `A task runs ${path}. Put each file that a task runs at ${BIN}/<name>.ts, the one place where every workspace keeps its commands, so that fallow and the other tools find it without a list of files.`,
    })),
  );

const runsOf = (program: unknown): readonly CommandRun[] =>
  pipe(nestedValues(RUN_TASKS)(program), Arr.flatMap(stringsIn), Arr.flatMap(runsIn));

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(
  root: string,
  directory: string,
  workflows: string,
) {
  const files = yield* RepositoryFiles;
  const config = yield* workspaceConfigOf(root, directory);
  const entries = yield* declaredEntries(root, directory);
  const commands = yield* commandFilesIn(root, directory);
  const runs = pipe(
    config,
    Option.map(({ program }) => runsOf(program)),
    Option.getOrElse((): readonly CommandRun[] => []),
  );
  const runPaths = pipe(
    runs,
    Arr.map(({ path }) => path),
  );
  const outside = pipe(
    config,
    Option.map(({ file, source }) => outsideProblems({ file, source, runs, entries })),
    Option.getOrElse((): readonly Problem[] => []),
  );
  const isRun = (path: string): boolean =>
    Arr.contains(runPaths, path) ||
    Arr.contains(entries.bins, path) ||
    Str.includes(workspacePath(directory, path))(workflows);
  const unrun = pipe(
    commands,
    Arr.filter((path) => !isRun(path)),
    Arr.map((path): Problem => ({
      file: files.join(root, directory, path),
      line: FIRST,
      column: FIRST,
      rule: UNRUN,
      message: `No task, package.json bin or workflow runs ${workspacePath(directory, path)}. Files in ${BIN}/ are entry points for fallow, so an unused one is never reported. Run it from a task or delete it.`,
    })),
  );
  return [...outside, ...unrun];
});

const scriptsProblem = Effect.fn("scriptsProblem")(function* scriptsProblem(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, directory, SCRIPTS_DIRECTORY);
  const isDirectory = yield* files.isDirectory(file);
  return pipe(
    isDirectory,
    Option.filter(Boolean),
    Option.map((): Problem => ({
      file,
      line: FIRST,
      column: FIRST,
      rule: SCRIPTS,
      message: `${workspacePath(directory, SCRIPTS_DIRECTORY)} is a scripts directory. Put each command at ${BIN}/<name>.ts and the code that it shares in the package's own source, so that every workspace runs its commands the same way.`,
    })),
  );
});

/** @internal */
export const checkCommandEntries = Effect.fn("checkCommandEntries")(function* checkCommandEntries(
  root: string,
) {
  const directories = yield* workspaceDirectories(root);
  const all = ["", ...directories];
  const workflows = yield* workflowText(root);
  const found = yield* Effect.forEach(all, (directory) => problemsIn(root, directory, workflows), {
    concurrency: READ_CONCURRENCY,
  });
  const scripts = yield* Effect.forEach(all, (directory) => scriptsProblem(root, directory), {
    concurrency: READ_CONCURRENCY,
  });
  return [...Arr.flatten(found), ...Arr.getSomes(scripts)];
});
