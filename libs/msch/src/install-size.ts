import {
  Array as Arr,
  Effect,
  HashMap,
  HashSet,
  Number as Num,
  Option,
  Order,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { MANIFEST_FILE } from "./dependencies.ts";
import { packagesByEntry } from "./import-graph.ts";
import { installedClosure, installedSize, keysOf } from "./installed-closure.ts";
import type { Problem, RuleName } from "./problem.ts";
import { typeScriptCompiler } from "./project.ts";
import { publicEntriesOf } from "./public-entries.ts";
import type { PublicEntry } from "./public-entries.ts";
import { publishedWorkspaces } from "./published.ts";
import type { PublishedWorkspace } from "./published.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const INSTALL_SIZE: RuleName = "install-size";
const STACK_DEPENDENCY: RuleName = "stack-dependency";
const STACK_CATALOG = "catalog:stack";
const BUDGET_KEY = "installSize";
const DEPENDENCIES_KEY = '"dependencies"';
const LISTED_LARGEST = 5;
const SIZE_CONCURRENCY = 32;
const MEGABYTE = 1_000_000;
const MEGABYTE_DIGITS = 1;
const START = 0;
const SINGLE_ENTRY = 1;

interface DependencySize {
  readonly name: string;
  readonly size: number;
  readonly entries: readonly string[];
}

interface Published {
  readonly workspace: PublishedWorkspace;
  readonly entries: readonly PublicEntry[];
  readonly provided: HashSet.HashSet<string>;
}

interface Measured {
  readonly closures: readonly (readonly [string, HashSet.HashSet<string>])[];
  readonly sizeOf: (packages: HashSet.HashSet<string>) => number;
  readonly total: number;
}

interface Overrun {
  readonly workspace: PublishedWorkspace;
  readonly total: number;
  readonly largest: readonly DependencySize[];
  readonly entryCount: number;
}

const megabytes = (bytes: number): string => `${(bytes / MEGABYTE).toFixed(MEGABYTE_DIGITS)} MB`;

const usageHint = (dependency: DependencySize, entryCount: number): string => {
  const partial =
    entryCount > SINGLE_ENTRY &&
    dependency.entries.length > START &&
    dependency.entries.length < entryCount;
  if (!partial) {
    return "";
  }
  return ` (imported only from ${Arr.join(dependency.entries, ", ")})`;
};

const listed = ({ largest, entryCount }: Overrun): string =>
  pipe(
    largest,
    Arr.map(
      (dependency) =>
        `${dependency.name} ${megabytes(dependency.size)}${usageHint(dependency, entryCount)}`,
    ),
    Arr.join(", "),
  );

const budgetProblem = Effect.fn("budgetProblem")(function* budgetProblem(overrun: Overrun) {
  const files = yield* RepositoryFiles;
  const { workspace, total } = overrun;
  const config = yield* files.readFile(workspace.configFile);
  const source = Option.getOrElse(config, () => "");
  const index = Option.getOrElse(Str.indexOf(BUDGET_KEY)(source), () => START);
  return {
    file: workspace.configFile,
    ...positionOf(source)(index),
    rule: INSTALL_SIZE,
    message: `installing this package adds ${megabytes(total)} of dependencies besides its peers, over the ${workspace.installSize} in msch.publish.installSize. Largest: ${listed(overrun)}. Make a dependency imported only from some entries an optional peer, move one that the installing project already has to peerDependencies, or replace a heavy one. Raise installSize only when none of these applies.`,
  } satisfies Problem;
});

const measure = Effect.fn("measure")(function* measure(
  { workspace, provided }: Published,
  direct: readonly string[],
) {
  const closures = yield* pipe(
    direct,
    Effect.forEach((name) =>
      installedClosure({ provided, from: workspace.directory, name }).pipe(
        Effect.map((packages) => [name, packages] as const),
      ),
    ),
  );
  const everything = pipe(
    closures,
    Arr.flatMap(([, packages]) => Arr.fromIterable(packages)),
    HashSet.fromIterable,
  );
  const measured = yield* Effect.forEach(
    everything,
    (found) => installedSize(found).pipe(Effect.map((size) => [found, size] as const)),
    { concurrency: SIZE_CONCURRENCY },
  );
  const sizes = HashMap.fromIterable(measured);
  const sizeOf = (packages: HashSet.HashSet<string>): number =>
    Num.sumAll(
      pipe(
        Arr.fromIterable(packages),
        Arr.map((found) => Option.getOrElse(HashMap.get(sizes, found), () => START)),
      ),
    );
  return { closures, sizeOf, total: sizeOf(everything) } satisfies Measured;
});

const importersOf = Effect.fn("importersOf")(function* importersOf({
  workspace,
  entries,
}: Published) {
  const compiler = yield* typeScriptCompiler;
  const sources = pipe(
    entries,
    Arr.map((entry) => entry.source),
    Arr.dedupe,
  );
  const byEntry = yield* packagesByEntry(compiler.api, workspace.directory, sources);
  const reached = HashMap.fromIterable(byEntry);
  return (name: string): readonly string[] =>
    pipe(
      entries,
      Arr.filter((entry) =>
        pipe(HashMap.get(reached, entry.source), Option.exists(HashSet.has(name))),
      ),
      Arr.map((entry) => entry.label),
      Arr.dedupe,
    );
}, Effect.scoped);

const bySizeDescending = Order.mapInput(
  Order.flip(Order.Number),
  (dependency: DependencySize) => dependency.size,
);

const sizeProblems = Effect.fn("sizeProblems")(function* sizeProblems(
  published: Published,
  direct: readonly string[],
) {
  const { closures, sizeOf, total } = yield* measure(published, direct);
  if (total <= published.workspace.installBudget) {
    return [];
  }
  const importers = yield* importersOf(published);
  const largest = pipe(
    closures,
    Arr.map(([name, packages]): DependencySize => ({
      name,
      size: sizeOf(packages),
      entries: importers(name),
    })),
    Arr.sortBy(bySizeDescending),
    Arr.take(LISTED_LARGEST),
  );
  const entryCount = pipe(
    published.entries,
    Arr.map((entry) => entry.label),
    Arr.dedupe,
  ).length;
  const problem = yield* budgetProblem({
    workspace: published.workspace,
    total,
    largest,
    entryCount,
  });
  return [problem];
});

const stackProblems = (
  file: string,
  source: string,
  dependencies: Readonly<Record<string, string>>,
): readonly Problem[] => {
  const section = Option.getOrElse(Str.indexOf(DEPENDENCIES_KEY)(source), () => START);
  const rest = Str.slice(section)(source);
  return pipe(
    Rec.toEntries(dependencies),
    Arr.filter(([, specifier]) => specifier === STACK_CATALOG),
    Arr.map(([name]): Problem => ({
      file,
      ...positionOf(source)(
        section + Option.getOrElse(Str.indexOf(`"${name}"`)(rest), () => START),
      ),
      rule: STACK_DEPENDENCY,
      message: `${name} comes from the stack catalog, so every project that installs this package already has it. Move it to peerDependencies and keep it in devDependencies, so the installing project shares one copy.`,
    })),
  );
};

const PublishedManifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  peerDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  exports: Schema.optional(Schema.Unknown),
  bin: Schema.optional(Schema.Unknown),
});

const problemsOf = Effect.fn("problemsOf")(function* problemsOf(
  workspace: PublishedWorkspace,
  file: string,
  source: string,
) {
  const files = yield* RepositoryFiles;
  const manifest = Schema.decodeOption(Schema.fromJsonString(PublishedManifest))(source);
  if (Option.isNone(manifest)) {
    return [];
  }
  const dependencies = Option.getOrElse(
    Option.fromUndefinedOr(manifest.value.dependencies),
    () => ({}),
  );
  const entries = publicEntriesOf({
    manifest: manifest.value,
    join: (target) => files.join(workspace.directory, target),
    packEntries: workspace.packEntries,
  });
  const provided = HashSet.fromIterable(keysOf(manifest.value.peerDependencies));
  const sized = yield* sizeProblems({ workspace, entries, provided }, Rec.keys(dependencies));
  return [...stackProblems(file, source, dependencies), ...sized];
});

const workspaceProblems = Effect.fn("workspaceProblems")(function* workspaceProblems(
  workspace: PublishedWorkspace,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(workspace.directory, MANIFEST_FILE);
  const source = yield* files.readFile(file);
  return yield* Option.match(source, {
    onNone: () => Effect.succeed<readonly Problem[]>([]),
    onSome: (text) => problemsOf(workspace, file, text),
  });
});

/** @internal */
const checkPublishedPackages = Effect.fn("checkPublishedPackages")(function* checkPublishedPackages(
  root: string,
) {
  const workspaces = yield* publishedWorkspaces(root);
  const found = yield* pipe(workspaces, Effect.forEach(workspaceProblems));
  return Arr.flatten(found);
});

export { checkPublishedPackages };
