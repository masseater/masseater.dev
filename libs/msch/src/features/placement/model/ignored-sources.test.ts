import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkIgnoredSources } from "./ignored-sources.ts";

const flagsIgnoredSources = Effect.gen(function* flagsIgnoredSources() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ".gitignore": "build/\n*.log\n",
    "apps/web/src/build/entry.ts": "export const entry = 1;\n",
    "apps/web/src/app/main.ts": "export const main = 1;\n",
    "apps/web/build/out.js": "",
    "apps/web/node_modules/pkg/src/debug.log": "",
  });
  const problems = yield* checkIgnoredSources(root);
  expect(
    pipe(
      problems,
      Arr.map((problem) => `${repositoryFiles.relative(root, problem.file)} ${problem.rule}`),
    ),
  ).toStrictEqual(["apps/web/src/build/entry.ts ignored-sources"]);
});

layer(fixtureLayer)("ignored sources", (it) => {
  it.effect("flags files under src that .gitignore hides", () => flagsIgnoredSources);
});
