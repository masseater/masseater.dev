import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { loadLanguage, readTree } from "#/shared/lib/tree-sitter.ts";
import type { Language } from "#/shared/lib/tree-sitter.ts";

import englishVerbs from "./english-verbs.json" with { type: "json" };
import { fileProblem } from "./member-sources.ts";
import { readRustFile } from "./rust-syntax.ts";
import type { RustFile, RustItem, RustPath } from "./rust-syntax.ts";

const LAYERED_RULE: RuleName = "layered-source";
const ENTRY_RULE: RuleName = "public-entry";
const TEST_RULE: RuleName = "colocated-test";
const SLICE_RULE: RuleName = "feature-slice-name";
const IMPORT_RULE: RuleName = "layer-import";
const GRAMMAR = "rust";
const MANIFEST = "Cargo.toml";
const SEPARATOR = "/";
const WORD_SEPARATOR = "_";
const MINIMUM_WORDS = 2;
const SOURCE_DIRECTORY = "src";
const MODULE_INDEX = "mod";
const RUST_FILE = /\.rs$/u;
const CRATE_ROOTS: readonly string[] = ["src/lib.rs", "src/main.rs"];
const BINARY = /^src\/bin\/[^/]+\.rs$/u;
const OUTSIDE_ALLOWED = /^(?:build\.rs|benches\/.+)$/u;
const SEPARATE_TEST = /^tests\/.+$/u;
const LAYERS: readonly string[] = ["app", "pages", "widgets", "features", "entities", "shared"];
const SHARED_SLICES: readonly string[] = ["app", "shared"];
const SLICED_LAYERS: readonly string[] = ["pages", "widgets", "features", "entities", "shared"];
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
const SLICE_DEPTH = 2;
const LAYER_DEPTH = 1;
const READ_CONCURRENCY = 64;
const NEXT = 1;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];
const VERBS: ReadonlySet<string> = new Set(englishVerbs);

const OUTSIDE_MESSAGE =
  "sits outside src/. Put every module of a crate under src/ in an FSD layer; only build.rs and benches/ may stay outside.";
const LAYER_MESSAGE = `is not an FSD layer. A crate's src/ holds only lib.rs, main.rs, bin/ and the layers ${Arr.join(LAYERS, ", ")}.`;
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

const upwardMessage = (target: string, source: string): string =>
  `uses the ${target} layer from the ${source} layer. A layer may only use the layers below it (${Arr.join(LAYERS, ", ")}).`;

const crossMessage = (layer: string, target: string, source: string): string =>
  `uses the ${layer} slice ${target} from the slice ${source}. Slices of one layer must not use each other; move what they share down a layer.`;

interface RustSource {
  readonly crate: string;
  readonly inner: string;
  readonly file: string;
}

interface Read {
  readonly source: RustSource;
  readonly parsed: RustFile;
}

type Kind = "root" | "layer" | "module" | "test" | "skipped" | "misplaced";

const byLength = Order.mapInput(Order.Number, (directory: string) => directory.length);

const crateDirectories = (listed: readonly string[]): readonly string[] =>
  pipe(
    listed,
    Arr.filter((name) => name === MANIFEST || Str.endsWith(`${SEPARATOR}${MANIFEST}`)(name)),
    Arr.map((name) => Str.slice(0, Math.max(0, name.length - MANIFEST.length - NEXT))(name)),
  );

const crateOf =
  (crates: readonly string[]) =>
  (name: string): Option.Option<Omit<RustSource, "file">> =>
    pipe(
      crates,
      Arr.filter((crate) => crate === "" || Str.startsWith(`${crate}${SEPARATOR}`)(name)),
      (owners) => Arr.last(Arr.sort(owners, byLength)),
      Option.map((crate) => ({
        crate,
        inner: crate === "" ? name : Str.slice(crate.length + SEPARATOR.length)(name),
      })),
    );

const modulePathOf = (inner: string): readonly string[] => {
  const parts = Str.split(
    Str.replace(RUST_FILE, "")(Str.slice(SOURCE_DIRECTORY.length + NEXT)(inner)),
    SEPARATOR,
  );
  return Option.exists(Arr.last(parts), (last) => last === MODULE_INDEX)
    ? Arr.dropRight(parts, NEXT)
    : parts;
};

const kindOf = (inner: string): Kind => {
  if (Arr.contains(CRATE_ROOTS, inner) || BINARY.test(inner)) {
    return "root";
  }
  if (SEPARATE_TEST.test(inner)) {
    return "test";
  }
  if (OUTSIDE_ALLOWED.test(inner)) {
    return "skipped";
  }
  if (!Str.startsWith(`${SOURCE_DIRECTORY}${SEPARATOR}`)(inner)) {
    return "misplaced";
  }
  const path = modulePathOf(inner);
  if (!Option.exists(Arr.head(path), (layer) => Arr.contains(LAYERS, layer))) {
    return "misplaced";
  }
  return path.length === LAYER_DEPTH ? "layer" : "module";
};

const placementProblem = (
  { crate, inner, file }: RustSource,
  root: string,
  join: (...segments: readonly string[]) => string,
): Problem => {
  if (!Str.startsWith(`${SOURCE_DIRECTORY}${SEPARATOR}`)(inner)) {
    return fileProblem({ file, rule: LAYERED_RULE, message: OUTSIDE_MESSAGE });
  }
  const top = pipe(
    Arr.head(modulePathOf(inner)),
    Option.getOrElse(() => ""),
  );
  return fileProblem({
    file: join(root, crate, SOURCE_DIRECTORY, top),
    rule: LAYERED_RULE,
    message: LAYER_MESSAGE,
  });
};

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

const resolvedFrom = (
  segments: readonly string[],
  current: readonly string[],
): Option.Option<readonly string[]> => {
  const [first, ...rest] = segments;
  switch (first) {
    case "crate": {
      return Option.some(rest);
    }
    case "self": {
      return resolvedFrom(rest, current);
    }
    case "super": {
      return Arr.isReadonlyArrayNonEmpty(current)
        ? resolvedFrom(rest, Arr.dropRight(current, NEXT))
        : Option.none();
    }
    default: {
      return Option.some([...current, ...segments]);
    }
  }
};

const rankOf = (layer: string): number =>
  Arr.findFirstIndex(LAYERS, (name) => name === layer).pipe(Option.getOrElse(() => -NEXT));

const importMessage = (
  source: readonly string[],
  target: readonly string[],
): Option.Option<string> => {
  const [sourceLayer = "", sourceSlice = ""] = source;
  const [targetLayer = "", targetSlice = ""] = target;
  if (!Arr.contains(LAYERS, targetLayer) || target.length < SLICE_DEPTH) {
    return Option.none();
  }
  if (rankOf(targetLayer) < rankOf(sourceLayer)) {
    return Option.some(upwardMessage(targetLayer, sourceLayer));
  }
  if (
    targetLayer === sourceLayer &&
    targetSlice !== sourceSlice &&
    !Arr.contains(SHARED_SLICES, targetLayer)
  ) {
    return Option.some(crossMessage(targetLayer, targetSlice, sourceSlice));
  }
  return Option.none();
};

const importProblems = (
  file: string,
  modulePath: readonly string[],
  paths: readonly RustPath[],
): readonly Problem[] =>
  pipe(
    paths,
    Arr.flatMap((path) =>
      pipe(
        resolvedFrom(path.segments, [...modulePath, ...path.scope]),
        Option.flatMap((target) => importMessage(modulePath, target)),
        Option.map((message) => itemProblem(file, IMPORT_RULE, message)(path)),
        Option.toArray,
      ),
    ),
    Arr.dedupeWith(
      (left, right) =>
        left.line === right.line && left.column === right.column && left.message === right.message,
    ),
  );

const isSliceIndex = (modulePath: readonly string[]): boolean =>
  modulePath.length === SLICE_DEPTH &&
  Option.exists(Arr.head(modulePath), (layer) => Arr.contains(SLICED_LAYERS, layer));

const isVerbObject = (slice: string): boolean => {
  const words = Str.split(slice, WORD_SEPARATOR);
  return words.length >= MINIMUM_WORDS && Option.exists(Arr.head(words), (word) => VERBS.has(word));
};

const problemsOf = ({ source, parsed }: Read): readonly Problem[] => {
  const { inner, file } = source;
  switch (kindOf(inner)) {
    case "root": {
      return pipe(
        parsed.items,
        Arr.filter((item) => !isRootItem(inner)(item)),
        Arr.map(itemProblem(file, LAYERED_RULE, ROOT_MESSAGE)),
      );
    }
    case "layer": {
      return pipe(
        parsed.items,
        Arr.filter((item) => !isLayerItem(item)),
        Arr.map(itemProblem(file, LAYERED_RULE, LAYER_INDEX_MESSAGE)),
      );
    }
    case "test": {
      return parsed.replacesAllocator
        ? []
        : [fileProblem({ file, rule: TEST_RULE, message: TEST_MESSAGE })];
    }
    case "module": {
      const modulePath = modulePathOf(inner);
      const entry = isSliceIndex(modulePath)
        ? pipe(
            parsed.items,
            Arr.filter((item) => item.kind === "mod_item" && item.visible),
            Arr.map(itemProblem(file, ENTRY_RULE, ENTRY_MESSAGE)),
          )
        : [];
      return [...entry, ...importProblems(file, modulePath, parsed.paths)];
    }
    default: {
      return [];
    }
  }
};

const sliceNameProblems = (
  root: string,
  join: (...segments: readonly string[]) => string,
  sources: readonly RustSource[],
): readonly Problem[] =>
  pipe(
    sources,
    Arr.filter(({ inner }) => kindOf(inner) === "module"),
    Arr.flatMap(({ crate, inner }) => {
      const [layer, slice] = modulePathOf(inner);
      return layer === FEATURES && slice !== undefined && !isVerbObject(slice)
        ? [join(root, crate, SOURCE_DIRECTORY, FEATURES, slice)]
        : [];
    }),
    Arr.dedupe,
    Arr.map((file) => fileProblem({ file, rule: SLICE_RULE, message: SLICE_MESSAGE })),
  );

const parsedWith =
  (language: Language) =>
  (source: RustSource, text: string): Option.Option<Read> =>
    Option.map(readTree(language, text, readRustFile), (parsed) => ({ source, parsed }));

/** @internal */
export const checkRustModules = Effect.fn("checkRustModules")(function* checkRustModules(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  const rust = Arr.filter(listed, (name) => RUST_FILE.test(name));
  if (!Arr.isReadonlyArrayNonEmpty(rust)) {
    return [];
  }
  const crates = crateDirectories(listed);
  const sources = pipe(
    rust,
    Arr.flatMap((name) =>
      Option.toArray(
        Option.map(crateOf(crates)(name), (owned) => ({ ...owned, file: files.join(root, name) })),
      ),
    ),
  );
  const misplaced = pipe(
    sources,
    Arr.filter(({ inner }) => kindOf(inner) === "misplaced"),
    Arr.map((source) => placementProblem(source, root, files.join)),
    Arr.dedupeWith((left, right) => left.file === right.file),
  );
  const language = yield* loadLanguage(GRAMMAR).pipe(Effect.orDie);
  const parse = parsedWith(language);
  const read = yield* Effect.forEach(
    Arr.filter(
      sources,
      ({ inner }) => kindOf(inner) !== "misplaced" && kindOf(inner) !== "skipped",
    ),
    (source) =>
      files.readFile(source.file).pipe(Effect.map(Option.flatMap((text) => parse(source, text)))),
    { concurrency: READ_CONCURRENCY },
  );
  return [
    ...misplaced,
    ...sliceNameProblems(root, files.join, sources),
    ...Arr.flatMap(Arr.getSomes(read), problemsOf),
  ];
});
