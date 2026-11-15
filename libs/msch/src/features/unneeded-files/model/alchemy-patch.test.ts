import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkAlchemyPatch } from "./alchemy-patch.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(workspace: string) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": workspace });
  const problems = yield* checkAlchemyPatch(root);
  return pipe(
    problems,
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsPatchesToAlchemy = Effect.gen(function* flagsPatchesToAlchemy() {
  const findings = yield* findingsFor(
    'packages:\n  - apps/*\npatchedDependencies:\n  eslint-plugin-drizzle@0.2.3: patches/eslint-plugin-drizzle@0.2.3.patch\n  alchemy@2.0.0-beta.87: patches/alchemy.patch\n  "@alchemy.run/cloudflare@2.0.0": patches/cloudflare.patch\n',
  );
  expect(findings).toStrictEqual([
    "pnpm-workspace.yaml:5 alchemy-patch",
    "pnpm-workspace.yaml:6 alchemy-patch",
  ]);
});

const passesOtherPatches = Effect.gen(function* passesOtherPatches() {
  const findings = yield* findingsFor(
    "packages:\n  - apps/*\npatchedDependencies:\n  alchemy-like@1.0.0: patches/alchemy-like.patch\n",
  );
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("Alchemy is not patched", (it) => {
  it.effect("flags patches to alchemy and its packages", () => flagsPatchesToAlchemy);
  it.effect("passes patches to other packages", () => passesOtherPatches);
});
