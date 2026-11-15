import { Array as Arr, Effect, Option, Order, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "./dependencies.ts";
import type { Problem, RuleName } from "./problem.ts";
import { publicEntriesOf } from "./public-entries.ts";
import type { EntryManifest } from "./public-entries.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RULE: RuleName = "colocated-test";
const FIRST = 1;
const READ_CONCURRENCY = 64;
const ROOT_SUBPATH = ".";
const NAME_GROUP = "name";
const SPECIFIER_GROUP = "specifier";
const SCRIPT = /\.[cm]?[jt]sx?$/u;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/u;
const MANIFEST_NAME = /package\.json$/u;
const SEPARATE_TEST_DIRECTORY = /(?:^|\/)(?:__tests__|__mocks__|tests?|specs?)\//u;
const RELATIVE_REFERENCE = /["'`]\.\/(?<name>[^/"'`]+)/gu;
const DIRNAME_REFERENCE = /import\.meta\.dirname\s*,\s*["'](?<name>[^/"']+)["']/gu;
const MODULE_SPECIFIER =
  /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\bvi\.mock\(\s*)["'](?<specifier>[^"'.#][^"']*)["']/gu;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];

const DIRECTORY_MESSAGE =
  "sits in a separate test directory. Put each test next to the module it tests, and test-only helpers next to the tests as <name>.test.support.ts.";
const SIBLING_MESSAGE =
  "refers to nothing in its own directory. Move the test next to the module it tests and import that module, or a helper beside it, with ./<name>.";

const Manifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  exports: Schema.optional(Schema.Unknown),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

interface TestFile {
  readonly name: string;
  readonly base: string;
  readonly file: string;
  readonly directory: string;
}

interface Context {
  readonly root: string;
  readonly packages: readonly string[];
}

interface Beside {
  readonly join: (target: string) => string;
  readonly dirname: (file: string) => string;
  readonly directory: string;
}

const byLength = Order.mapInput(Order.Number, (directory: string) => directory.length);

const problemFor = (test: TestFile, message: string): Problem => ({
  file: test.file,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message: `${test.base} ${message}`,
});

const groupsOf = (source: string, pattern: RegExp, group: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(pattern)(source)),
    Arr.map((match) =>
      pipe(
        Option.fromUndefinedOr(match.groups),
        Option.flatMap((groups) => Option.fromUndefinedOr(groups[group])),
      ),
    ),
    Arr.getSomes,
  );

const namesSibling = (source: string): boolean =>
  pipe(
    [
      ...groupsOf(source, RELATIVE_REFERENCE, NAME_GROUP),
      ...groupsOf(source, DIRNAME_REFERENCE, NAME_GROUP),
    ],
    Arr.some((name) => !TEST_FILE.test(name)),
  );

const ownerOf = (packages: readonly string[], name: string): Option.Option<string> => {
  const owners = pipe(
    packages,
    Arr.filter((directory) => Str.startsWith(directory)(name)),
  );
  return Arr.last(Arr.sort(owners, byLength));
};

const specifiersBeside =
  ({ join, dirname, directory }: Beside) =>
  (manifest: EntryManifest): readonly string[] =>
    pipe(
      Option.fromUndefinedOr(manifest.name),
      Option.map((name) =>
        pipe(
          publicEntriesOf({ manifest, join, packEntries: [] }),
          Arr.filter(({ source }) => dirname(source) === directory),
          Arr.map(({ label }) => Str.replace(ROOT_SUBPATH, name)(label)),
        ),
      ),
      Option.getOrElse((): readonly string[] => []),
    );

const ownSpecifiers = Effect.fn("ownSpecifiers")(function* ownSpecifiers(
  context: Context,
  test: TestFile,
) {
  const files = yield* RepositoryFiles;
  const owner = ownerOf(context.packages, test.name);
  if (Option.isNone(owner)) {
    return [];
  }
  const text = yield* files.readFile(files.join(context.root, owner.value, MANIFEST_FILE));
  const join = (target: string): string => files.join(context.root, owner.value, target);
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.map(specifiersBeside({ join, dirname: files.dirname, directory: test.directory })),
    Option.getOrElse((): readonly string[] => []),
  );
});

const refersToOwnDirectory = Effect.fn("refersToOwnDirectory")(function* refersToOwnDirectory(
  context: Context,
  test: TestFile,
  source: string,
) {
  if (namesSibling(source)) {
    return true;
  }
  const specifiers = groupsOf(source, MODULE_SPECIFIER, SPECIFIER_GROUP);
  if (Arr.isReadonlyArrayEmpty(specifiers)) {
    return false;
  }
  const own = yield* ownSpecifiers(context, test);
  return pipe(
    specifiers,
    Arr.some((specifier) => pipe(own, Arr.contains(specifier))),
  );
});

const refersIn = Effect.fn("refersIn")(function* refersIn(context: Context, test: TestFile) {
  const files = yield* RepositoryFiles;
  const source = yield* files.readFile(test.file);
  if (Option.isNone(source)) {
    return true;
  }
  return yield* refersToOwnDirectory(context, test, source.value);
});

const problemIn = Effect.fn("problemIn")(function* problemIn(context: Context, test: TestFile) {
  if (SEPARATE_TEST_DIRECTORY.test(test.name)) {
    return Option.some(problemFor(test, DIRECTORY_MESSAGE));
  }
  if (!TEST_FILE.test(test.name)) {
    return Option.none<Problem>();
  }
  const refers = yield* refersIn(context, test);
  if (refers) {
    return Option.none<Problem>();
  }
  return Option.some(problemFor(test, SIBLING_MESSAGE));
});

/** @internal */
const checkColocatedTests = Effect.fn("checkColocatedTests")(function* checkColocatedTests(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  const names = pipe(listed, Arr.filter(Str.isNonEmpty));
  const context: Context = {
    root,
    packages: pipe(
      names,
      Arr.filter((name) => files.basename(name) === MANIFEST_FILE),
      Arr.map(Str.replace(MANIFEST_NAME, "")),
    ),
  };
  const tests = pipe(
    names,
    Arr.filter((name) => SCRIPT.test(name)),
    Arr.map((name): TestFile => {
      const file = files.join(root, name);
      return { name, base: files.basename(name), file, directory: files.dirname(file) };
    }),
  );
  const found = yield* Effect.forEach(tests, (test) => problemIn(context, test), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

export { checkColocatedTests };
