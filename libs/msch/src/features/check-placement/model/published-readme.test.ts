import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPublishedReadme } from "./published-readme.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkPublishedReadme(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)}:${String(problem.column)}`,
    ),
  );
});

const flagsJapaneseInPublishedReadmes = Effect.gen(function* flagsJapaneseInPublishedReadmes() {
  const findings = yield* findingsFor({
    "pnpm-workspace.yaml": "packages:\n  - libs/*\n",
    "package.json": '{ "name": "repo", "private": true }',
    "README.md": "# repo\n\nリポジトリ\n",
    "libs/kit/package.json": '{ "name": "kit" }',
    "libs/kit/README.md": "# kit\n\nRun `kit` で検査する。\n",
    "libs/english/package.json": '{ "name": "english" }',
    "libs/english/README.md": "# english\n\nRun `english`.\n",
    "libs/internal/package.json": '{ "name": "internal", "private": true }',
    "libs/internal/README.md": "# internal\n\n内部用\n",
  });
  expect(findings).toStrictEqual(["libs/kit/README.md:3:11"]);
});

const flagsPublishedRootPackage = Effect.gen(function* flagsPublishedRootPackage() {
  const findings = yield* findingsFor({
    "package.json": '{ "name": "single" }',
    "README.md": "# single\n\n日本語\n",
  });
  expect(findings).toStrictEqual(["README.md:3:1"]);
});

layer(Layer.mergeAll(nodeServicesLayer, fixtureLayer))("checkPublishedReadme", (it) => {
  it.effect(
    "flags Japanese in the README of a published workspace",
    () => flagsJapaneseInPublishedReadmes,
  );
  it.effect(
    "flags Japanese in the README of a published root package",
    () => flagsPublishedRootPackage,
  );
});
