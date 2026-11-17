import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPackageScope } from "./package-scope.ts";

const flagsPublishedPackagesOutsideTheScope = Effect.gen(
  function* flagsPublishedPackagesOutsideTheScope() {
    const repositoryFiles = yield* RepositoryFiles;
    const root = yield* gitRepositoryWith({
      "package.json": '{ "name": "root", "private": true }\n',
      "apps/web/package.json": '{ "name": "web" }\n',
      "libs/scoped/package.json":
        '{ "name": "@r_masseater/scoped", "publishConfig": { "access": "public" } }\n',
      "libs/bare/package.json":
        '{\n  "publishConfig": { "access": "public" },\n  "name": "bare"\n}\n',
      "libs/other/package.json": '{ "name": "@other/tool", "publishConfig": {} }\n',
      "libs/kept/package.json": '{ "name": "kept", "private": true, "publishConfig": {} }\n',
    });
    const problems = yield* checkPackageScope(root);
    expect(
      pipe(
        sortProblems(problems),
        Arr.map(
          (problem) =>
            `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
        ),
      ),
    ).toStrictEqual([
      "libs/bare/package.json:3 package-scope",
      "libs/other/package.json:1 package-scope",
    ]);
  },
);

layer(fixtureLayer)("published packages use the owner's scope", (it) => {
  it.effect(
    "flags a published package outside @r_masseater",
    () => flagsPublishedPackagesOutsideTheScope,
  );
});
