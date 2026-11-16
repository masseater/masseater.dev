import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkDocsMirror } from "./docs-mirror.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const manifest = (name: string): string => lines([`{ "name": "${name}" }`]);

const flagsMirroredLists = Effect.gen(function* flagsMirroredLists() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    "pnpm-workspace.yaml": lines(["packages:", "  - libs/*"]),
    "libs/alpha/package.json": manifest("@scope/alpha"),
    "libs/beta/package.json": manifest("@scope/beta"),
    "libs/gamma/package.json": manifest("gamma"),
    "AGENTS.md": lines([
      "# Workspaces",
      "",
      "- `libs/alpha` holds the parser.",
      "- `@scope/beta` renders it.",
      "- gamma glues them.",
    ]),
    "libs/alpha/README.md": lines(["Uses `@scope/beta` and `libs/gamma`.", "", "See libs/alpha."]),
    "libs/beta/AGENTS.md": lines(["Pairs with gammaray and libs/alphabet."]),
  });
  const problems = yield* checkDocsMirror(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual(["AGENTS.md:3 docs-mirror"]);
});

layer(fixtureLayer)("docs mirror", (it) => {
  it.effect("flags docs that list three or more other workspaces", () => flagsMirroredLists);
});
