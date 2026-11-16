import { Effect, Record as Rec, Schema, Array as Arr, pipe } from "effect";

import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkRepository } from "./check.ts";

const stringifyUnknown = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

export const jsonOf = (value: unknown): Effect.Effect<string, Schema.SchemaError> =>
  stringifyUnknown(value);

export const dependingOn = (
  ...names: readonly string[]
): Effect.Effect<string, Schema.SchemaError> =>
  stringifyUnknown({
    name: "fixture",
    dependencies: pipe(
      names,
      Arr.map((name) => [name, "1.0.0"] as const),
      Rec.fromEntries,
    ),
  });

const defaultFiles = Effect.gen(function* defaultFiles() {
  const packageJson = yield* stringifyUnknown({ name: "fixture" });
  const tsconfig = yield* stringifyUnknown({
    compilerOptions: {
      strict: true,
      module: "nodenext",
      moduleResolution: "nodenext",
      target: "esnext",
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["src"],
  });
  return { "package.json": packageJson, "tsconfig.json": tsconfig };
});

const fixtureRepository = Effect.fn("fixtureRepository")(function* fixtureRepository(
  files: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const defaults = yield* defaultFiles;
  const root = yield* directoryWith({ ...defaults, ...files });
  yield* fixtures.symlink(
    repositoryFiles.resolve(import.meta.dirname, "..", "..", "..", "..", "node_modules", "effect"),
    repositoryFiles.join(root, "node_modules", "effect"),
  );
  return root;
});

export const findingsIn = Effect.fn("findingsIn")(function* findingsIn(
  files: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* fixtureRepository(files);
  yield* fixtures.commitAll(root);
  const problems = yield* checkRepository(root);
  return pipe(
    problems,
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

export const findingsAfterEdit = Effect.fn("findingsAfterEdit")(function* findingsAfterEdit(
  files: Readonly<Record<string, string>>,
  edits: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* fixtureRepository(files);
  yield* fixtures.commitAll(root);
  const describe = (problems: readonly Problem[]): readonly string[] =>
    pipe(
      problems,
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    );
  const before = yield* checkRepository(root);
  yield* Effect.forEach(Rec.toEntries(edits), ([file, source]) =>
    fixtures.writeFile(repositoryFiles.join(root, file), source),
  );
  const after = yield* checkRepository(root);
  return [describe(before), describe(after)] as const;
});

export type Change = (root: string) => Effect.Effect<void, never, FixtureFiles | RepositoryFiles>;

const cacheEntries = Effect.fn("cacheEntries")(function* cacheEntries(root: string) {
  const repositoryFiles = yield* RepositoryFiles;
  yield* checkRepository(root);
  return yield* repositoryFiles.readDirectory(
    repositoryFiles.join(root, "node_modules", ".cache", "msch", "value-owners"),
  );
});

export const cacheEntriesAfter = Effect.fn("cacheEntriesAfter")(function* cacheEntriesAfter(
  files: Readonly<Record<string, string>>,
  change: Change,
) {
  const fixtures = yield* FixtureFiles;
  const root = yield* fixtureRepository(files);
  yield* fixtures.commitAll(root);
  const before = yield* cacheEntries(root);
  yield* change(root);
  const after = yield* cacheEntries(root);
  return { before, after };
});
