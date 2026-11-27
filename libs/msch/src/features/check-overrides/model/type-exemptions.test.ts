import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkTypeExemptions } from "./type-exemptions.ts";

const FROM = "from";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkTypeExemptions(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsTypesExemptedByName = Effect.gen(function* flagsTypesExemptedByName() {
  const findings = yield* findingsFor({
    "vite.config.ts": `const NODE = { ${FROM}: "lib" as const, name: "Node" };\nexport default {\n  lint: { rules: { "typescript/no-floating-promises": ["error", { allowForKnownSafePromises: [{ ${FROM}: 'package', name: "Effect", package: "effect" }] }] } },\n};\n`,
    "apps/web/lint.config.ts": `export const allow = [\n  { ${FROM}: "file", name: ["Table"], path: "src/table.ts" },\n];\n`,
    ".oxlintrc.json": `{ "rules": { "typescript/only-throw-error": ["error", { "allow": [{ "${FROM}": "package", "name": "Failure", "package": "effect" }] }] } }\n`,
  });
  expect(findings).toStrictEqual([
    ".oxlintrc.json:1 named-type-exemption",
    "apps/web/lint.config.ts:2 named-type-exemption",
    "vite.config.ts:1 named-type-exemption",
    "vite.config.ts:3 named-type-exemption",
  ]);
});

const allowsOtherUsesOfTheWord = Effect.gen(function* allowsOtherUsesOfTheWord() {
  const findings = yield* findingsFor({
    "vite.config.ts": `import settings ${FROM} "package";\nexport const copied = Array.${FROM}(settings);\nexport const task = { ${FROM}: "dependencies", task: "build" };\n`,
    "src/move.ts": `export const move = { ${FROM}: "inbox", to: "archive" };\n`,
    "docs/lint.md": `Do not write { ${FROM}: "package" } in a rule option.\n`,
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("checkTypeExemptions", (it) => {
  it.effect(
    "flags a type exempted from a lint rule by name in any config format",
    () => flagsTypesExemptedByName,
  );
  it.effect(
    "allows imports, Array.from and other objects with the key",
    () => allowsOtherUsesOfTheWord,
  );
});
