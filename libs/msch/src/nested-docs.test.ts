import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { checkNestedDocs } from "./nested-docs.ts";
import { sortProblems } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "./repository.test.support.ts";

const README_ALLOWED = "export default { msch: { readme: true } };\n";
const README_NOT_SET = "export default { msch: {} };\n";
const PUBLISHED_PACKAGE = '{ "name": "published" }';

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
    "apps/site/vite.config.ts": README_NOT_SET,
    "apps/other/package.json": PUBLISHED_PACKAGE,
    "apps/other/README.md": "# other\n",
    "apps/site/README.md": "# site\n",
    "libs/published/AGENTS.md": "# published\n",
    "tools/script/readme.txt": "notes\n",
    "docs/guide/Readme.md": "# guide\n",
  });
  expect(findings).toStrictEqual([
    "apps/other/README.md nested-docs",
    "apps/site/AGENTS.md nested-docs",
    "apps/site/CLAUDE.md nested-docs",
    "apps/site/README.md nested-docs",
    "docs/guide/Readme.md nested-docs",
    "libs/published/AGENTS.md nested-docs",
    "tools/script/readme.txt nested-docs",
  ]);
});

const passesRootDocsAndPublishedReadmes = Effect.gen(function* passesRootDocsAndPublishedReadmes() {
  const findings = yield* findingsFor({
    "AGENTS.md": "# repo\n",
    "CLAUDE.md": "@AGENTS.md\n",
    "README.md": "# repo\n",
    "libs/published/vite.config.ts": README_ALLOWED,
    "libs/published/README.md": "# published\n",
    "apps/site/public/avatars/claude.svg": "<svg/>",
    "docs/agents.md.example": "example\n",
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("nested docs", (it) => {
  it.effect(
    "flags AGENTS.md and CLAUDE.md below the root, and README files without msch.readme in vite.config.ts",
    () => flagsNestedDocs,
  );
  it.effect(
    "passes the root documents and a README whose vite.config.ts sets msch.readme",
    () => passesRootDocsAndPublishedReadmes,
  );
});
