import { Array as Arr, Boolean as Bool, Effect, Option, Schema, String as Str, pipe } from "effect";

import { installedPackages, nearestManifestDirectory } from "#/entities/project/index.ts";
import type { ProjectInputs } from "#/entities/project/index.ts";
import { ProblemList } from "#/shared/lib/problem.ts";
import { NODE_MODULES, RepositoryFiles } from "#/shared/lib/repository-files.ts";

const CACHE_DIRECTORY = [NODE_MODULES, ".cache", "msch", "value-owners"] as const;
const CACHE_SUFFIX = ".json";
const MANIFEST_ENTRY = "package.json";
const SOURCE_ENTRY = "src";
const LOWER_LAYERS = ["entities", "shared"] as const;
const PATH_SEPARATOR = "/";
const EMPTY = "";
const NOT_INSTALLED: readonly string[] = [];
const FIELD_SEPARATOR = "\0";
const LINE_SEPARATOR = "\n";

const ValueSchema = Schema.Union([Schema.String, Schema.Finite]);

const Strings = Schema.Array(Schema.String);

const ScopeSchema = Schema.Struct({ name: Schema.String, dependencies: Strings });

const FileLiteralsSchema = Schema.Struct({
  scope: ScopeSchema,
  file: Schema.String,
  values: Strings,
  imports: Strings,
});

const UnownedSiteSchema = Schema.Struct({
  scope: ScopeSchema,
  file: Schema.String,
  start: Schema.Int,
  line: Schema.Int,
  column: Schema.Int,
  values: Schema.Array(ValueSchema),
});

const AnalysisSchema = Schema.Struct({
  problems: ProblemList,
  unowned: Schema.Array(UnownedSiteSchema),
  literals: Schema.Array(FileLiteralsSchema),
});

const AnalysisJson = Schema.fromJsonString(AnalysisSchema);

export type Analysis = typeof AnalysisSchema.Type;

export type Hasher = (text: string) => Effect.Effect<string>;

export type FileDigest = (file: string) => Effect.Effect<string, never, RepositoryFiles>;

export interface AnalysisCache {
  readonly root: string;
  readonly directory: string;
  readonly salt: string;
  readonly digestFile: FileDigest;
  readonly hash: Hasher;
}

const hasher = Effect.gen(function* currentHasher() {
  const files = yield* RepositoryFiles;
  const hash: Hasher = files.hash;
  return hash;
});

const entryOf = (file: string, found: string): string => `${file}${FIELD_SEPARATOR}${found}`;

const fileDigest = (hash: Hasher): FileDigest => {
  const digests = new Map<string, string>();
  return (file) =>
    Option.match(Option.fromUndefinedOr(digests.get(file)), {
      onSome: Effect.succeed,
      onNone: () =>
        Effect.gen(function* readDigest() {
          const files = yield* RepositoryFiles;
          const text = yield* files.readFile(file);
          const found = yield* hash(Option.getOrElse(text, () => EMPTY));
          digests.set(file, found);
          return found;
        }),
    });
};

const digestEntries =
  (digestFile: FileDigest) =>
  (
    named: readonly (readonly [string, string])[],
  ): Effect.Effect<readonly string[], never, RepositoryFiles> =>
    Effect.forEach(
      named,
      ([name, file]) => digestFile(file).pipe(Effect.map((found) => entryOf(name, found))),
      { concurrency: 1 },
    );

const walked = (directory: string): Effect.Effect<readonly string[], never, RepositoryFiles> =>
  Effect.gen(function* walkFrom() {
    const files = yield* RepositoryFiles;
    const found = yield* files.walkDirectory(directory);
    return pipe(
      found,
      Arr.map((file) => files.join(directory, file)),
    );
  });

const sourceFiles = Effect.fn("sourceFiles")(function* sourceFiles(
  root: string,
  moduleDirectory: string,
) {
  const files = yield* RepositoryFiles;
  const source = files.join(root, SOURCE_ENTRY);
  const layers = pipe(
    LOWER_LAYERS,
    Arr.map((layer) => files.join(source, layer)),
  );
  const nested = yield* Effect.forEach([files.dirname(moduleDirectory), ...layers], walked, {
    concurrency: 1,
  });
  return Arr.flatten(nested);
});

const bundleParts = Effect.fn("bundleParts")(function* bundleParts(
  root: string,
  moduleDirectory: string,
) {
  const files = yield* RepositoryFiles;
  const bundled = yield* walked(moduleDirectory);
  return { listed: [files.join(root, MANIFEST_ENTRY), ...bundled], installed: NOT_INSTALLED };
});

const sourceParts = Effect.fn("sourceParts")(function* sourceParts(
  root: string,
  moduleDirectory: string,
) {
  const listed = yield* sourceFiles(root, moduleDirectory);
  const installed = yield* installedPackages(root, root);
  return { listed, installed };
});

/** @internal */
export const implementationOf = Effect.fn("implementationOf")(function* implementationOf(
  moduleDirectory: string,
) {
  const files = yield* RepositoryFiles;
  const root = yield* nearestManifestDirectory(moduleDirectory);
  const fromSource = Str.startsWith(`${files.join(root, SOURCE_ENTRY)}${PATH_SEPARATOR}`)(
    moduleDirectory,
  );
  const parts = yield* Bool.match(fromSource, {
    onFalse: () => bundleParts(root, moduleDirectory),
    onTrue: () => sourceParts(root, moduleDirectory),
  });
  return {
    files: pipe(
      Arr.sort(parts.listed, Str.Order),
      Arr.map((file) => [files.relative(root, file), file] as const),
    ),
    installed: parts.installed,
  };
});

const fingerprintOf = Effect.fn("fingerprintOf")(function* fingerprintOf(hash: Hasher) {
  const implementation = yield* implementationOf(import.meta.dirname);
  const entries = yield* digestEntries(fileDigest(hash))(implementation.files);
  return yield* hash(Arr.join([...implementation.installed, ...entries], LINE_SEPARATOR));
});

export const analysisCache = Effect.fn("analysisCache")(function* analysisCache(
  root: string,
  owners: string,
) {
  const files = yield* RepositoryFiles;
  const hash = yield* hasher;
  const fingerprint = yield* fingerprintOf(hash);
  const salt = yield* hash(
    Arr.join([fingerprint, Str.replaceAll(root, EMPTY)(owners)], FIELD_SEPARATOR),
  );
  return {
    root,
    directory: files.join(root, ...CACHE_DIRECTORY),
    salt,
    digestFile: fileDigest(hash),
    hash,
  } satisfies AnalysisCache;
});

export const keyOf =
  (cache: AnalysisCache) =>
  (configPath: string, inputs: ProjectInputs): Effect.Effect<string, never, RepositoryFiles> =>
    Effect.gen(function* deriveKey() {
      const files = yield* RepositoryFiles;
      const entries = yield* digestEntries(cache.digestFile)(
        pipe(
          inputs.files,
          Arr.map((file) => [file, files.join(cache.root, file)] as const),
        ),
      );
      const header = [
        cache.salt,
        files.relative(cache.root, configPath),
        Str.replaceAll(cache.root, EMPTY)(inputs.options),
      ];
      return yield* cache.hash(
        Arr.join([...header, ...inputs.dependencies, ...entries], LINE_SEPARATOR),
      );
    });

const moved =
  (move: (file: string) => string) =>
  (analysis: Analysis): Analysis => ({
    problems: pipe(
      analysis.problems,
      Arr.map((problem) => ({ ...problem, file: move(problem.file) })),
    ),
    unowned: pipe(
      analysis.unowned,
      Arr.map((site) => ({ ...site, file: move(site.file) })),
    ),
    literals: pipe(
      analysis.literals,
      Arr.map((found) => ({
        ...found,
        file: move(found.file),
        imports: pipe(found.imports, Arr.map(move)),
      })),
    ),
  });

const entryFile = (cache: AnalysisCache, key: string): string =>
  `${cache.directory}/${key}${CACHE_SUFFIX}`;

export const readAnalysis =
  (cache: AnalysisCache) =>
  (key: string): Effect.Effect<Option.Option<Analysis>, never, RepositoryFiles> =>
    Effect.gen(function* readCached() {
      const files = yield* RepositoryFiles;
      const text = yield* files.readFile(entryFile(cache, key));
      const restored = moved((file) => files.resolve(cache.root, file));
      return yield* Option.match(text, {
        onNone: () => Effect.succeedNone,
        onSome: (found) => Schema.decodeEffect(AnalysisJson)(found).pipe(Effect.option),
      }).pipe(Effect.map(Option.map(restored)));
    });

export const writeAnalysis =
  (cache: AnalysisCache) =>
  (key: string, analysis: Analysis): Effect.Effect<void, never, RepositoryFiles> =>
    Effect.gen(function* writeCached() {
      const files = yield* RepositoryFiles;
      const portable = moved((file) => files.relative(cache.root, file))(analysis);
      const text = yield* Schema.encodeEffect(AnalysisJson)(portable).pipe(Effect.option);
      yield* Option.match(text, {
        onNone: () => Effect.void,
        onSome: (found) => files.writeFile(entryFile(cache, key), found),
      });
    });

export const pruneAnalyses =
  (cache: AnalysisCache) =>
  (kept: readonly string[]): Effect.Effect<void, never, RepositoryFiles> =>
    Effect.gen(function* pruneCached() {
      const files = yield* RepositoryFiles;
      const keep = new Set(
        pipe(
          kept,
          Arr.map((key) => `${key}${CACHE_SUFFIX}`),
        ),
      );
      const present = yield* files.readDirectory(cache.directory);
      yield* pipe(
        present,
        Arr.filter((name) => !keep.has(name)),
        (items) =>
          Effect.forEach(items, (name) => files.removeFile(files.join(cache.directory, name)), {
            concurrency: 1,
          }),
        Effect.asVoid,
      );
    });
