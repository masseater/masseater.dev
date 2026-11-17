import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkTypescriptGeneration } from "./typescript-generation.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const FIXTURE = {
  "package.json": '{ "devDependencies": { "typescript": "7.1.0-beta", "linter": "1.0.0" } }\n',
  "pnpm-lock.yaml": lines([
    "lockfileVersion: '9.0'",
    "",
    "importers:",
    "",
    "  .:",
    "    devDependencies:",
    "      linter:",
    "        specifier: 1.0.0",
    "        version: 1.0.0",
    "      typescript:",
    "        specifier: 7.1.0-beta",
    "        version: 7.1.0-beta",
    "",
    "packages:",
    "",
    "  '@typescript/typescript6@6.0.2':",
    "    resolution: {integrity: sha512-AAAA}",
    "",
    "  linter@1.0.0:",
    "    resolution: {integrity: sha512-BBBB}",
    "",
    "  typescript@5.9.3:",
    "    resolution: {integrity: sha512-CCCC}",
    "",
    "  typescript@6.0.3:",
    "    resolution: {integrity: sha512-DDDD}",
    "",
    "  typescript@7.1.0-beta:",
    "    resolution: {integrity: sha512-EEEE}",
    "",
    "snapshots:",
    "",
    "  '@typescript/typescript6@6.0.2':",
    "    dependencies:",
    "      '@typescript/old': typescript@6.0.3",
    "",
    "  linter@1.0.0:",
    "    dependencies:",
    "      '@typescript/typescript6': 6.0.2",
    "      typescript: 5.9.3",
    "",
    "  typescript@5.9.3: {}",
    "",
    "  typescript@6.0.3: {}",
    "",
    "  typescript@7.1.0-beta: {}",
  ]),
};

const flagsOldCompilers = Effect.gen(function* flagsOldCompilers() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(FIXTURE);
  const found = yield* checkTypescriptGeneration(root);
  const problems = sortProblems(found);
  expect(
    pipe(
      problems,
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    "pnpm-lock.yaml:16 legacy-typescript",
    "pnpm-lock.yaml:22 legacy-typescript",
    "pnpm-lock.yaml:25 legacy-typescript",
  ]);
  expect(
    pipe(
      problems,
      Arr.map((problem) => problem.message),
      Arr.filter((message) => Str.startsWith("`typescript@6.0.3`")(message)),
    ),
  ).toStrictEqual([expect.stringContaining("pulled in by `@typescript/typescript6@6.0.2`")]);
});

layer(fixtureLayer)("typescript generation", (it) => {
  it.effect(
    "flags compilers older than TypeScript 7 and names what pulls them in",
    () => flagsOldCompilers,
  );
});
