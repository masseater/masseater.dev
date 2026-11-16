import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkRestrictedRules } from "./restricted-rules.ts";

const RESTRICTED = "no-restricted";
const IMPORTS = `${RESTRICTED}-imports`;
const PROPERTIES = `${RESTRICTED}-properties`;

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkRestrictedRules(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsUnnamedRestrictions = Effect.gen(function* flagsUnnamedRestrictions() {
  const findings = yield* findingsFor({
    "vite.config.ts": `export default {\n  lint: { rules: { "eslint/${IMPORTS}": ["error", {}] } },\n};\n`,
    "apps/web/lint.config.ts": `export const rules = {\n  "${PROPERTIES}": "off",\n  "typescript/${IMPORTS}": "error",\n};\n`,
    ".oxlintrc.json": `{ "rules": { "${IMPORTS}": "error" } }\n`,
  });
  expect(findings).toStrictEqual([
    ".oxlintrc.json:1 unnamed-restriction",
    "apps/web/lint.config.ts:2 unnamed-restriction",
    "apps/web/lint.config.ts:3 unnamed-restriction",
    "vite.config.ts:2 unnamed-restriction",
  ]);
});

const allowsNamedRules = Effect.gen(function* allowsNamedRules() {
  const findings = yield* findingsFor({
    "vite.config.ts": `export default {\n  lint: { rules: { "msch-lint/traced-elysia": "error", "eslint-js/${RESTRICTED}-syntax": "error" } },\n};\n`,
    "docs/lint.md": `The rule ${IMPORTS} is not used.\n`,
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("checkRestrictedRules", (it) => {
  it.effect(
    "flags the two unnamed restriction rules under any plugin prefix",
    () => flagsUnnamedRestrictions,
  );
  it.effect("allows named rules, the syntax restriction and prose", () => allowsNamedRules);
});
