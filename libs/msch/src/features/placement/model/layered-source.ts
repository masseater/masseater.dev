import { Array as Arr, Effect, Option, Order, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE, publicEntriesOf } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const LAYERED_RULE: RuleName = "layered-source";
const ENTRY_RULE: RuleName = "public-entry";
const FIRST = 1;
const ROOT_WORKSPACE = ".";
const SOURCE_DIRECTORY = "src";
const SEPARATOR = "/";
const LAYERS: readonly string[] = ["app", "pages", "widgets", "features", "entities", "shared"];
const SCRIPT = /\.[cm]?[jt]sx?$/u;
const ROOT_ALLOWED = /^(?:[^/]+\.config\.[cm]?[jt]s|alchemy\.[^/]+\.ts|[^/]+\.d\.[cm]?ts)$/u;
const PUBLIC_ENTRY =
  /^src\/(?:app\/[^/]+|(?:pages|widgets|features|entities)\/[^/]+\/index(?:\.[a-z]+)*\.tsx?|shared\/[^/]+\/index(?:\.[a-z]+)*\.tsx?|shared\/(?:ui|lib)\/.+)$/u;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];

const OUTSIDE_MESSAGE =
  "sits outside src/. Put every module of a workspace under src/ in an FSD layer; only *.config.ts, alchemy.*.ts and *.d.ts may stay at the workspace root.";
const LOOSE_MESSAGE =
  "sits directly in src/. Put it in a layer: app/ for entry points and wiring, features/<verb>-<object>/ for one operation, entities/<noun>/ for a shared domain object, or shared/<segment>/ for code without domain rules.";
const LAYER_MESSAGE = `is not an FSD layer. src/ holds only ${Arr.join(LAYERS, ", ")}.`;
const ENTRY_MESSAGE =
  "is a package entry that points inside a slice. Point exports and bin at src/app/<entry>.ts or at a slice's index.ts.";

const Manifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  exports: Schema.optional(Schema.Unknown),
  bin: Schema.optional(Schema.Unknown),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

interface Owned {
  readonly workspace: string;
  readonly inner: string;
}

const byLength = Order.mapInput(Order.Number, (directory: string) => directory.length);

const problemAt = (file: string, rule: RuleName, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule,
  message,
});

const ownerOf =
  (workspaces: readonly string[]) =>
  (name: string): Option.Option<Owned> =>
    pipe(
      workspaces,
      Arr.filter((workspace) => Str.startsWith(`${workspace}${SEPARATOR}`)(name)),
      (owners) => Arr.last(Arr.sort(owners, byLength)),
      Option.map((workspace) => ({ workspace, inner: Str.slice(workspace.length + 1)(name) })),
    );

const layerProblemOf = (owned: Owned): Option.Option<readonly [string, string]> => {
  const parts = Str.split(owned.inner, SEPARATOR);
  const [top, layer] = parts;
  if (top !== SOURCE_DIRECTORY) {
    return Option.liftPredicate(
      [`${owned.workspace}${SEPARATOR}${owned.inner}`, OUTSIDE_MESSAGE] as const,
      () => !ROOT_ALLOWED.test(owned.inner),
    );
  }
  if (parts.length === 2) {
    return Option.some([`${owned.workspace}${SEPARATOR}${owned.inner}`, LOOSE_MESSAGE] as const);
  }
  return Option.liftPredicate(
    [
      `${owned.workspace}${SEPARATOR}${SOURCE_DIRECTORY}${SEPARATOR}${layer}`,
      LAYER_MESSAGE,
    ] as const,
    () => !pipe(LAYERS, Arr.contains(layer ?? "")),
  );
};

const entryProblems = Effect.fn("entryProblems")(function* entryProblems(
  root: string,
  workspace: string,
) {
  const files = yield* RepositoryFiles;
  const directory = files.join(root, workspace);
  const text = yield* files.readFile(files.join(directory, MANIFEST_FILE));
  const join = (target: string): string => files.join(directory, target);
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.map((manifest) => publicEntriesOf({ manifest, join, packEntries: [] })),
    Option.getOrElse(() => []),
    Arr.filter(({ source }) => !PUBLIC_ENTRY.test(files.relative(directory, source))),
    Arr.map(({ label, source }) => problemAt(source, ENTRY_RULE, `${label} ${ENTRY_MESSAGE}`)),
  );
});

/** @internal */
export const checkLayeredSource = Effect.fn("checkLayeredSource")(function* checkLayeredSource(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const workspaces = pipe(
    yield* workspaceDirectories(root),
    Arr.filter((workspace) => workspace !== ROOT_WORKSPACE),
  );
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  const layered = pipe(
    listed,
    Arr.filter((name) => SCRIPT.test(name)),
    Arr.map(ownerOf(workspaces)),
    Arr.getSomes,
    Arr.map(layerProblemOf),
    Arr.getSomes,
    Arr.dedupeWith(([left], [right]) => left === right),
    Arr.map(([file, message]) => problemAt(files.join(root, file), LAYERED_RULE, message)),
  );
  const entries = yield* Effect.forEach(workspaces, (workspace) => entryProblems(root, workspace));
  return [...layered, ...Arr.flatten(entries)];
});
