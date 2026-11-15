import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { nearestManifestDirectory } from "#/entities/project/index.ts";
import type { ProjectInputs } from "#/entities/project/index.ts";
import { ProblemList } from "#/shared/lib/problem.ts";
import { NODE_MODULES, RepositoryFiles } from "#/shared/lib/repository-files.ts";

const CACHE_DIRECTORY = [NODE_MODULES, ".cache", "msch", "value-owners"] as const;
const CACHE_SUFFIX = ".json";
const MANIFEST_ENTRY = "package.json";
const FINGERPRINTED = ["src", "dist"] as const;
const EMPTY = "";
const FIELD_SEPARATOR = "\0";
const LINE_SEPARATOR = "\n";

const ValueSchema = Schema.Union([Schema.String, Schema.Finite]);

const UnownedSiteSchema = Schema.Struct({
  scope: Schema.Struct({ name: Schema.String, dependencies: Schema.Array(Schema.String) }),
  file: Schema.String,
  start: Schema.Int,
  line: Schema.Int,
  column: Schema.Int,
  values: Schema.Array(ValueSchema),
});

const AnalysisSchema = Schema.Struct({
  problems: ProblemList,
  unowned: Schema.Array(UnownedSiteSchema),
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
    pipe(
      named,
      Effect.forEach(([name, file]) =>
        digestFile(file).pipe(Effect.map((found) => entryOf(name, found))),
      ),
    );

const fingerprintedFiles = Effect.fn("fingerprintedFiles")(function* fingerprintedFiles(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const nested = yield* pipe(
    FINGERPRINTED,
    Effect.forEach((entry) => {
      const base = files.join(root, entry);
      return files.walkDirectory(base).pipe(Effect.map(Arr.map((file) => files.join(base, file))));
    }),
  );
  return Arr.sort([files.join(root, MANIFEST_ENTRY), ...Arr.flatten(nested)], Str.Order);
});

const fingerprintOf = Effect.fn("fingerprintOf")(function* fingerprintOf(hash: Hasher) {
  const root = yield* nearestManifestDirectory(import.meta.dirname);
  const listed = yield* fingerprintedFiles(root);
  const entries = yield* digestEntries(fileDigest(hash))(
    pipe(
      listed,
      Arr.map((file) => [file, file] as const),
    ),
  );
  return yield* hash(Arr.join(entries, LINE_SEPARATOR));
});

export const analysisCache = Effect.fn("analysisCache")(function* analysisCache(
  root: string,
  owners: string,
) {
  const files = yield* RepositoryFiles;
  const hash = yield* hasher;
  const fingerprint = yield* fingerprintOf(hash);
  const salt = yield* hash(Arr.join([fingerprint, owners], FIELD_SEPARATOR));
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
      const header = [cache.salt, files.relative(cache.root, configPath), inputs.options];
      return yield* cache.hash(Arr.join([...header, ...entries], LINE_SEPARATOR));
    });

const entryFile = (cache: AnalysisCache, key: string): string =>
  `${cache.directory}/${key}${CACHE_SUFFIX}`;

export const readAnalysis =
  (cache: AnalysisCache) =>
  (key: string): Effect.Effect<Option.Option<Analysis>, never, RepositoryFiles> =>
    Effect.gen(function* readCached() {
      const files = yield* RepositoryFiles;
      const text = yield* files.readFile(entryFile(cache, key));
      return yield* Option.match(text, {
        onNone: () => Effect.succeedNone,
        onSome: (found) => Schema.decodeEffect(AnalysisJson)(found).pipe(Effect.option),
      });
    });

export const writeAnalysis =
  (cache: AnalysisCache) =>
  (key: string, analysis: Analysis): Effect.Effect<void, never, RepositoryFiles> =>
    Effect.gen(function* writeCached() {
      const files = yield* RepositoryFiles;
      const text = yield* Schema.encodeEffect(AnalysisJson)(analysis).pipe(Effect.option);
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
        Effect.forEach((name) => files.removeFile(files.join(cache.directory, name))),
        Effect.asVoid,
      );
    });
