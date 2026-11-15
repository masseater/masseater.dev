import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkRootDocs } from "./root-docs.ts";

const flagsStrayRootDocs = Effect.gen(function* flagsStrayRootDocs() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    "README.md": "# repo\n",
    "README.ja.md": "# repo\n",
    "AGENTS.md": "- rule\n",
    "CLAUDE.md": "@AGENTS.md\n",
    "ARCHITECTURE.md": "# map\n",
    "DESIGN.md": "# design\n",
    "CHANGELOG.md": "# changelog\n",
    "LICENSE.md": "MIT\n",
    "SPEC.md": "# spec\n",
    "TODO.md": "- task\n",
    "notes.mdx": "# notes\n",
    "docs/plan.md": "# plan\n",
    "apps/site/NOTES.md": "# notes\n",
    "package.json": '{ "name": "repo" }',
  });
  const problems = yield* checkRootDocs(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map((problem) => `${repositoryFiles.relative(root, problem.file)} ${problem.rule}`),
    ),
  ).toStrictEqual(["SPEC.md root-docs", "TODO.md root-docs", "notes.mdx root-docs"]);
});

layer(fixtureLayer)("root docs", (it) => {
  it.effect(
    "flags markdown at the root other than the documents that belong there",
    () => flagsStrayRootDocs,
  );
});
