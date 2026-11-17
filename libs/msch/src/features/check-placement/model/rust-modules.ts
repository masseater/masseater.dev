import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { loadLanguage, readTree } from "#/shared/lib/tree-sitter.ts";
import type { Language } from "#/shared/lib/tree-sitter.ts";

import { fileProblem } from "./member-sources.ts";
import {
  BINARY,
  LAYERS,
  RUST_FILE,
  SLICE_DEPTH,
  SOURCE_DIRECTORY,
  crateDirectories,
  crateOf,
  isSliceIndex,
  kindOf,
  modulePathOf,
} from "./rust-layout.ts";
import type { Kind, RustSource } from "./rust-layout.ts";
import { readRustFile } from "./rust-syntax.ts";
import type { RustFile, RustItem } from "./rust-syntax.ts";
import { isVerbObjectBy } from "./source-names.ts";

const LAYERED_RULE: RuleName = "layered-source";
const ENTRY_RULE: RuleName = "public-entry";
const TEST_RULE: RuleName = "colocated-test";
const SLICE_RULE: RuleName = "feature-slice-name";
const GRAMMAR = "rust";
const WORD_SEPARATOR = "_";
const FEATURES = "features";
const MAIN = "main";
const MAIN_FILE = "src/main.rs";
const ROOT_ITEMS: readonly string[] = [
  "use_declaration",
  "attribute_item",
  "inner_attribute_item",
  "extern_crate_declaration",
];
const LAYER_ITEMS: readonly string[] = [
  "use_declaration",
  "attribute_item",
  "inner_attribute_item",
];
const READ_CONCURRENCY = 64;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];
const NONE: readonly Problem[] = [];

const ROOT_MESSAGE =
  "defines code in the crate root. Keep lib.rs and main.rs to mod declarations of layers, use, pub use and fn main, and put the code in a layer.";
const LAYER_INDEX_MESSAGE =
  "defines code in a layer module. A layer module holds only mod declarations of its slices and use; put the code in a slice.";
const ENTRY_MESSAGE =
  "makes an inner module of a slice public. Declare it with plain mod and re-export what other slices use with pub use from the slice module.";
const TEST_MESSAGE =
  "sits in a separate test directory. Put the test next to the code it tests as a #[cfg(test)] module; only a test that replaces the global allocator needs its own binary in tests/.";
const SLICE_MESSAGE =
  "is not named <verb>_<object>. Name a feature slice after the one operation it performs, starting with an English verb (for example check_layout, sync_manuscripts).";

const isFeatureName = isVerbObjectBy(WORD_SEPARATOR);

type Join = (...segments: readonly string[]) => string;

interface Read {
  readonly source: RustSource;
  readonly parsed: RustFile;
}

const itemProblem =
  (file: string, rule: RuleName, message: string) =>
  ({ line, column }: Readonly<{ line: number; column: number }>): Problem => ({
    file,
    line,
    column,
    rule,
    message,
  });

const isRootItem =
  (inner: string) =>
  (item: RustItem): boolean => {
    if (Arr.contains(ROOT_ITEMS, item.kind)) {
      return true;
    }
    if (item.kind === "mod_item") {
      return !item.inline && Option.exists(item.name, (name) => Arr.contains(LAYERS, name));
    }
    return (
      item.kind === "function_item" &&
      (inner === MAIN_FILE || BINARY.test(inner)) &&
      Option.contains(item.name, MAIN)
    );
  };

const isLayerItem = (item: RustItem): boolean =>
  Arr.contains(LAYER_ITEMS, item.kind) || (item.kind === "mod_item" && !item.inline);

const entryProblems = (
  file: string,
  modulePath: readonly string[],
  parsed: RustFile,
): readonly Problem[] => {
  if (!isSliceIndex(modulePath)) {
    return NONE;
  }
  return pipe(
    parsed.items,
    Arr.filter((item) => item.kind === "mod_item" && item.visible),
    Arr.map(itemProblem(file, ENTRY_RULE, ENTRY_MESSAGE)),
  );
};

const moduleProblems = ({ source, parsed }: Read): readonly Problem[] =>
  entryProblems(source.file, modulePathOf(source.inner), parsed);

const testProblems = ({ source, parsed }: Read): readonly Problem[] => {
  if (parsed.replacesAllocator) {
    return NONE;
  }
  return [fileProblem({ file: source.file, rule: TEST_RULE, message: TEST_MESSAGE })];
};

const strayItems = (
  { source, parsed }: Read,
  allowed: (item: RustItem) => boolean,
  message: string,
): readonly Problem[] =>
  pipe(
    parsed.items,
    Arr.filter((item) => !allowed(item)),
    Arr.map(itemProblem(source.file, LAYERED_RULE, message)),
  );

const PROBLEMS: Readonly<Record<Kind, (read: Read) => readonly Problem[]>> = {
  root: (read) => strayItems(read, isRootItem(read.source.inner), ROOT_MESSAGE),
  layer: (read) => strayItems(read, isLayerItem, LAYER_INDEX_MESSAGE),
  test: testProblems,
  module: moduleProblems,
  skipped: () => NONE,
  misplaced: () => NONE,
};

const problemsOf = (read: Read): readonly Problem[] => PROBLEMS[kindOf(read.source.inner)](read);

const misnamedSlice = (
  { crate, inner }: RustSource,
  root: string,
  join: Join,
): Option.Option<string> => {
  const modulePath = modulePathOf(inner);
  return pipe(
    Option.liftPredicate(modulePath, (path) => path.length >= SLICE_DEPTH),
    Option.filter((path) => Option.contains(Arr.head(path), FEATURES)),
    Option.flatMap((path) => Arr.last(Arr.take(path, SLICE_DEPTH))),
    Option.filter((slice) => !isFeatureName(slice)),
    Option.map((slice) => join(root, crate, SOURCE_DIRECTORY, FEATURES, slice)),
  );
};

const sliceNameProblems = (
  root: string,
  join: Join,
  sources: readonly RustSource[],
): readonly Problem[] =>
  pipe(
    sources,
    Arr.filter(({ inner }) => kindOf(inner) === "module"),
    Arr.flatMap((source) => Option.toArray(misnamedSlice(source, root, join))),
    Arr.dedupe,
    Arr.map((file) => fileProblem({ file, rule: SLICE_RULE, message: SLICE_MESSAGE })),
  );

const parsedWith =
  (language: Language) =>
  (source: RustSource, text: string): Option.Option<Read> =>
    Option.map(readTree({ language, source: text, read: readRustFile }), (parsed) => ({
      source,
      parsed,
    }));

const isRead = ({ inner }: RustSource): boolean => {
  const kind = kindOf(inner);
  return kind !== "misplaced" && kind !== "skipped";
};

const rustSources = Effect.fn("rustSources")(function* rustSources(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  const owner = crateOf(crateDirectories(listed));
  return pipe(
    listed,
    Arr.filter((name) => RUST_FILE.test(name)),
    Arr.flatMap((name) =>
      Option.toArray(
        Option.map(owner(name), (owned) => ({ ...owned, file: files.join(root, name) })),
      ),
    ),
  );
});

/** @internal */
export const checkRustModules = Effect.fn("checkRustModules")(function* checkRustModules(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const sources = yield* rustSources(root);
  if (!Arr.isReadonlyArrayNonEmpty(sources)) {
    return NONE;
  }
  const language = yield* loadLanguage(GRAMMAR).pipe(Effect.orDie);
  const parse = parsedWith(language);
  const read = yield* Effect.forEach(
    pipe(sources, Arr.filter(isRead)),
    (source) =>
      files.readFile(source.file).pipe(Effect.map(Option.flatMap((text) => parse(source, text)))),
    { concurrency: READ_CONCURRENCY },
  );
  return [
    ...sliceNameProblems(root, files.join, sources),
    ...Arr.flatMap(Arr.getSomes(read), problemsOf),
  ];
});
