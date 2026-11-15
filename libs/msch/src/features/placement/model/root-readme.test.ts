import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkRootReadme } from "./root-readme.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkRootReadme(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${problem.line}:${problem.column} ${problem.rule}`,
    ),
  );
});

const WORKSPACES = {
  "package.json": '{ "name": "repo" }',
  "apps/site/package.json": '{ "name": "@repo/site" }',
  "apps/site-demo/package.json": '{ "name": "@repo/site-demo" }',
  "libs/kit/package.json": '{ "name": "toolkit" }',
} as const;

const flagsWorkspaceNames = Effect.gen(function* flagsWorkspaceNames() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    "README.md": Arr.join("\n")([
      "# repo",
      "",
      "| site | https://example.com/site/ |",
      "See `apps/site-demo` and toolkit.",
      "Install @repo/site.",
    ]),
  });
  expect(findings).toStrictEqual([
    "README.md:3:3 root-readme",
    "README.md:3:30 root-readme",
    "README.md:4:6 root-readme",
    "README.md:4:26 root-readme",
    "README.md:5:9 root-readme",
  ]);
});

const flagsWorkspaceNamesInRootAgentDocs = Effect.gen(
  function* flagsWorkspaceNamesInRootAgentDocs() {
    const findings = yield* findingsFor({
      ...WORKSPACES,
      "AGENTS.md": "Run the check in toolkit.\n",
      "CLAUDE.md": "@AGENTS.md\n",
      "apps/site/AGENTS.md": "The site workspace keeps its own rules.\n",
    });
    expect(findings).toStrictEqual(["AGENTS.md:1:18 root-readme"]);
  },
);

const passesRepositoryWideReadme = Effect.gen(function* passesRepositoryWideReadme() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    "README.md":
      "# repo\n\nA website and the things it hosts. The list is on websites and kits pages.\n",
    "apps/site/README.md": "# site\n\nThe site workspace.\n",
  });
  expect(findings).toStrictEqual([]);
});

const passesTheCheckPolicy = Effect.gen(function* passesTheCheckPolicy() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    "libs/msch/package.json": '{ "name": "@r_masseater/msch" }',
    "README.md": "# repo\n\nEvery check lives in [msch](libs/msch).\n",
    "AGENTS.md": "Put every check into msch.\n",
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("root readme", (it) => {
  it.effect(
    "flags a workspace's directory, basename or package name in the root README",
    () => flagsWorkspaceNames,
  );
  it.effect(
    "flags a workspace named in the root AGENTS.md but not in a workspace AGENTS.md",
    () => flagsWorkspaceNamesInRootAgentDocs,
  );
  it.effect(
    "passes a root README about the whole repository and a workspace's own README",
    () => passesRepositoryWideReadme,
  );
  it.effect("passes the check policy msch named in the root docs", () => passesTheCheckPolicy);
});
