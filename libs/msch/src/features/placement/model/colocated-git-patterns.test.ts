import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkColocatedGitPatterns } from "./colocated-git-patterns.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkColocatedGitPatterns(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${problem.line} ${problem.message}`,
    ),
  );
});

const WORKSPACES = {
  "package.json": '{ "name": "repo" }',
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - libs/*\n  - .claude\n",
  "apps/site/package.json": '{ "name": "site" }',
  "apps/desk/package.json": '{ "name": "desk" }',
  "libs/kit/package.json": '{ "name": "kit" }',
  ".claude/package.json": '{ "name": "hooks" }',
} as const;

const flagsEntriesInsideAWorkspace = Effect.gen(function* flagsEntriesInsideAWorkspace() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    ".gitignore": Arr.join("\n")([
      "# build",
      "node_modules",
      "/target/",
      "libs/kit/cache/",
      "!/libs/kit/cache/keep",
      ".claude/worktrees/",
      "/apps/*/gen/",
      "**/snapshots/*.new.png",
      ".agents/skills/*",
      "",
    ]),
  });
  expect(findings).toStrictEqual([
    ".gitignore:4 matches only paths inside the workspace libs/kit. Move it to libs/kit/.gitignore and write it relative to that directory.",
    ".gitignore:5 matches only paths inside the workspace libs/kit. Move it to libs/kit/.gitignore and write it relative to that directory.",
    ".gitignore:6 matches only paths inside the workspace .claude. Move it to .claude/.gitignore and write it relative to that directory.",
    ".gitignore:7 matches paths inside the workspaces apps/desk, apps/site. Move it to the .gitignore of each workspace that needs it, or start it with **/ when it belongs to a tool any workspace can use.",
  ]);
});

const flagsRepeatedEntries = Effect.gen(function* flagsRepeatedEntries() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    ".gitignore": "node_modules\n.idea/\n.vscode/*\n.vitest\n",
    "apps/site/.gitignore": "node_modules/\n.idea\n.vscode/*\n/dist/\n!node_modules\n",
    "apps/desk/.gitignore": ".idea/\n/.vitest/\nlibs/.vitest\n",
  });
  expect(findings).toStrictEqual([
    "apps/desk/.gitignore:1 repeats .idea/ from the root .gitignore, which already applies here. Delete it.",
    "apps/desk/.gitignore:2 repeats .vitest from the root .gitignore, which already applies here. Delete it.",
    "apps/site/.gitignore:1 repeats node_modules from the root .gitignore, which already applies here. Delete it.",
  ]);
});

const passesColocatedEntries = Effect.gen(function* passesColocatedEntries() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    ".gitignore": "node_modules\n/target/\n**/src-tauri/permissions/\n",
    "libs/kit/.gitignore": "/cache/\n*.traineddata\n",
    "apps/site/.gitignore": "/gen/\n",
  });
  expect(findings).toStrictEqual([]);
});

const flagsAttributes = Effect.gen(function* flagsAttributes() {
  const findings = yield* findingsFor({
    ...WORKSPACES,
    ".gitattributes":
      "pnpm-lock.yaml linguist-generated\n**/generated/** linguist-generated\nlibs/kit/out.js   linguist-generated\n",
    "apps/site/.gitattributes":
      "**/generated/** linguist-generated\n**/generated/** -diff\n/data/** binary\n",
  });
  expect(findings).toStrictEqual([
    ".gitattributes:3 matches only paths inside the workspace libs/kit. Move it to libs/kit/.gitattributes and write it relative to that directory.",
    "apps/site/.gitattributes:1 repeats **/generated/** from the root .gitattributes, which already applies here. Delete it.",
  ]);
});

layer(fixtureLayer)("colocated ignores", (it) => {
  it.effect(
    "flags a .gitignore entry that matches only paths inside a workspace below it",
    () => flagsEntriesInsideAWorkspace,
  );
  it.effect(
    "flags a workspace entry that repeats one from an enclosing .gitignore",
    () => flagsRepeatedEntries,
  );
  it.effect(
    "flags a .gitattributes entry inside a workspace and one an enclosing .gitattributes already sets",
    () => flagsAttributes,
  );
  it.effect(
    "passes repository-wide entries at the root and workspace entries in the workspace",
    () => passesColocatedEntries,
  );
});
