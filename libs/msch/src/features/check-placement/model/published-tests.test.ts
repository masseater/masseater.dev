import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPublishedTests } from "./published-tests.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkPublishedTests(root);
  return pipe(
    sortProblems(problems),
    Arr.map((problem) => repositoryFiles.relative(root, problem.file)),
  );
});

const flagsUntestedPublishedPackages = Effect.gen(function* flagsUntestedPublishedPackages() {
  const findings = yield* findingsFor({
    "pnpm-workspace.yaml": "packages:\n  - libs/*\n",
    "package.json": '{ "name": "repo", "private": true }',
    "libs/kit/package.json": '{ "name": "kit" }',
    "libs/kit/src/index.ts": "export const kit = 1;\n",
    "libs/kit-extra/package.json": '{ "name": "kit-extra" }',
    "libs/kit-extra/src/index.test.ts": "test\n",
    "libs/tested/package.json": '{ "name": "tested" }',
    "libs/tested/src/app/index.test.tsx": "test\n",
    "libs/internal/package.json": '{ "name": "internal", "private": true }',
  });
  expect(findings).toStrictEqual(["libs/kit/package.json"]);
});

layer(Layer.mergeAll(nodeServicesLayer, fixtureLayer))("checkPublishedTests", (it) => {
  it.effect(
    "flags a published workspace with no test files, without counting a sibling's tests",
    () => flagsUntestedPublishedPackages,
  );
});
