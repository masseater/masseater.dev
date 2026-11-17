import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPackageRegistry } from "./package-registry.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkPackageRegistry(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsAWorkspaceWithoutTheGuard = Effect.gen(function* flagsAWorkspaceWithoutTheGuard() {
  const findings = yield* findingsFor({
    "package.json": '{ "private": true }\n',
    "pnpm-workspace.yaml": "packages:\n  - libs/*\n",
  });
  expect(findings).toStrictEqual(["pnpm-workspace.yaml:1 package-registry"]);
});

const flagsAnotherRegistry = Effect.gen(function* flagsAnotherRegistry() {
  const findings = yield* findingsFor({
    "package.json": '{ "private": true }\n',
    "pnpm-workspace.yaml": "packages:\n  - libs/*\nregistry: https://registry.npmjs.org/\n",
    "libs/a/.npmrc": "@scope:registry=https://example.com/\nregistry=https://registry.npmjs.org/\n",
  });
  expect(findings).toStrictEqual([
    "libs/a/.npmrc:2 package-registry",
    "pnpm-workspace.yaml:3 package-registry",
  ]);
});

const passesTheGuard = Effect.gen(function* passesTheGuard() {
  const findings = yield* findingsFor({
    "package.json": '{ "private": true }\n',
    "pnpm-workspace.yaml": "packages:\n  - libs/*\nregistry: https://npm.flatt.tech\n",
    ".npmrc": "registry=https://npm.flatt.tech/\n",
  });
  expect(findings).toStrictEqual([]);
});

const skipsRepositoriesWithoutAWorkspace = Effect.gen(
  function* skipsRepositoriesWithoutAWorkspace() {
    const findings = yield* findingsFor({ "README.md": "# none\n" });
    expect(findings).toStrictEqual([]);
  },
);

layer(fixtureLayer)("installs go through Takumi Guard", (it) => {
  it.effect("flags a workspace without the guard", () => flagsAWorkspaceWithoutTheGuard);
  it.effect("flags another registry", () => flagsAnotherRegistry);
  it.effect("passes the guard", () => passesTheGuard);
  it.effect("skips repositories without a workspace", () => skipsRepositoriesWithoutAWorkspace);
});
