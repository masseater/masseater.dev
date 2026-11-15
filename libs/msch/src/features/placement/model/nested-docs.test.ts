import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkNestedDocs } from "./nested-docs.ts";

const SITE_CONFIG = "export default {};\n";
const PUBLIC_PACKAGE = '{ "name": "published" }';
const PRIVATE_PACKAGE = '{ "name": "site", "private": true }';
const WORKSPACE_AGENTS_ALLOWED = "export default { msch: { workspaceAgentsMd: true } };\n";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkNestedDocs(root);
  return pipe(
    sortProblems(problems),
    Arr.map((problem) => `${repositoryFiles.relative(root, problem.file)} ${problem.rule}`),
  );
});

const flagsNestedDocs = Effect.gen(function* flagsNestedDocs() {
  const findings = yield* findingsFor({
    "apps/site/AGENTS.md": "# site\n",
    "apps/site/CLAUDE.md": "@AGENTS.md\n",
    "apps/site/vite.config.ts": SITE_CONFIG,
    "apps/site/README.md": "# site\n",
    "apps/other/package.json": PRIVATE_PACKAGE,
    "apps/other/docs/README.md": "# docs\n",
    "libs/published/AGENTS.md": "# published\n",
    "tools/script/readme.txt": "notes\n",
    "docs/guide/Readme.md": "# guide\n",
  });
  expect(findings).toStrictEqual([
    "apps/other/docs/README.md nested-docs",
    "apps/site/AGENTS.md nested-docs",
    "apps/site/CLAUDE.md nested-docs",
    "apps/site/README.md nested-docs",
    "docs/guide/Readme.md nested-docs",
    "libs/published/AGENTS.md nested-docs",
    "tools/script/readme.txt nested-docs",
  ]);
});

const passesRootDocsAndWorkspaceReadmes = Effect.gen(function* passesRootDocsAndWorkspaceReadmes() {
  const findings = yield* findingsFor({
    "AGENTS.md": "# repo\n",
    "CLAUDE.md": "@AGENTS.md\n",
    "README.md": "# repo\n",
    "libs/published/package.json": PUBLIC_PACKAGE,
    "libs/published/README.md": "# published\n",
    "apps/site/package.json": PRIVATE_PACKAGE,
    "apps/site/README.md": "# site\n",
    "apps/site/public/avatars/claude.svg": "<svg/>",
    "docs/agents.md.example": "example\n",
  });
  expect(findings).toStrictEqual([]);
});

const allowsWorkspaceAgentsMd = Effect.gen(function* allowsWorkspaceAgentsMd() {
  const findings = yield* findingsFor({
    "vite.config.ts": WORKSPACE_AGENTS_ALLOWED,
    "AGENTS.md": "# repo\n",
    "apps/site/package.json": PRIVATE_PACKAGE,
    "apps/site/AGENTS.md": "# site\n",
    "apps/site/CLAUDE.md": "@AGENTS.md\n",
    "apps/site/src/AGENTS.md": "# src\n",
    "apps/site/AGENTS.override.md": "# override\n",
    "docs/AGENTS.md": "# docs\n",
  });
  expect(findings).toStrictEqual([
    "apps/site/AGENTS.override.md nested-docs",
    "apps/site/CLAUDE.md nested-docs",
    "apps/site/src/AGENTS.md nested-docs",
    "docs/AGENTS.md nested-docs",
  ]);
});

layer(fixtureLayer)("nested docs", (it) => {
  it.effect(
    "flags AGENTS.md and CLAUDE.md below the root, and README files outside a workspace directory",
    () => flagsNestedDocs,
  );
  it.effect(
    "passes the root documents and a README next to a workspace's package.json",
    () => passesRootDocsAndWorkspaceReadmes,
  );
  it.effect(
    "passes AGENTS.md directly in a workspace when the root vite.config.ts sets msch.workspaceAgentsMd",
    () => allowsWorkspaceAgentsMd,
  );
});
