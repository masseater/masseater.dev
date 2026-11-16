import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { appliedPackageProblems } from "./applied-packages.ts";

const ADOPT = "@r_masseater/vite-plus-adopt";
const RULES = "@r_masseater/oxlint-typed-rules";
const MSCH = "@r_masseater/msch";

const APPLIED = [
  { name: ADOPT, bins: ["vpa"] },
  { name: RULES, bins: [] },
] as const;

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* appliedPackageProblems(root, APPLIED);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsDirectUseBesideMsch = Effect.gen(function* flagsDirectUseBesideMsch() {
  const findings = yield* findingsFor({
    "package.json": `{\n  "name": "fixture",\n  "devDependencies": {\n    "${MSCH}": "catalog:",\n    "${ADOPT}": "catalog:"\n  }\n}\n`,
    "pnpm-workspace.yaml": `packages:\n  - libs/*\ncatalog:\n  "${ADOPT}": 0.6.0\n`,
    "vite.config.ts": `import fsd from "${ADOPT}/fsd";\nconst rules = "${RULES}";\nexport default { fsd, rules };\n`,
    ".vite-hooks/pre-commit": "vp exec vpa --staged\n",
    "README.md": `Install ${ADOPT}.\n`,
    "libs/tool/package.json": `{ "name": "tool", "dependencies": { "${ADOPT}": "catalog:" } }`,
    "libs/tool/src/main.ts": `import { runVpa } from "${ADOPT}";\nexport const run = runVpa;\n`,
    "libs/msch/package.json": `{ "name": "${MSCH}", "dependencies": { "${ADOPT}": "catalog:" } }`,
  });
  expect(findings).toStrictEqual([
    ".vite-hooks/pre-commit:1 applied-package",
    "package.json:5 applied-package",
    "vite.config.ts:1 applied-package",
    "vite.config.ts:2 applied-package",
  ]);
});

const passesWithoutMsch = Effect.gen(function* passesWithoutMsch() {
  const findings = yield* findingsFor({
    "package.json": `{ "name": "fixture", "devDependencies": { "${ADOPT}": "catalog:" } }`,
    "vite.config.ts": `import fsd from "${ADOPT}/fsd";\nexport default fsd;\n`,
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("applied packages", (it) => {
  it.effect(
    "reports direct uses of a package msch applies in a workspace with msch",
    () => flagsDirectUseBesideMsch,
  );
  it.effect("leaves a workspace without msch alone", () => passesWithoutMsch);
});
