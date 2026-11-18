import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkEffectDiagnostics } from "./effect-diagnostics.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkEffectDiagnostics(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsPluginsThatStillReport = Effect.gen(function* flagsPluginsThatStillReport() {
  const findings = yield* findingsFor({
    "tsconfig.json":
      '{\n  "compilerOptions": {\n    "plugins": [\n      { "name": "@effect/language-service" }\n    ]\n  }\n}\n',
    "apps/web/tsconfig.base.json":
      '{\n  "compilerOptions": {\n    "plugins": [{ "name": "@effect/language-service", "diagnostics": true }]\n  }\n}\n',
  });
  expect(findings).toStrictEqual([
    "apps/web/tsconfig.base.json:3 effect-diagnostics-once",
    "tsconfig.json:4 effect-diagnostics-once",
  ]);
});

const passesPluginsThatLeaveDiagnosticsToLint = Effect.gen(
  function* passesPluginsThatLeaveDiagnosticsToLint() {
    const findings = yield* findingsFor({
      "tsconfig.json":
        '{\n  "compilerOptions": {\n    "plugins": [{ "name": "@effect/language-service", "diagnostics": false }]\n  }\n}\n',
      "apps/web/tsconfig.json": '{\n  "extends": "../../tsconfig.json"\n}\n',
      "libs/other/tsconfig.json":
        '{\n  "compilerOptions": { "plugins": [{ "name": "other-plugin" }] }\n}\n',
    });
    expect(findings).toStrictEqual([]);
  },
);

layer(fixtureLayer)("Effect diagnostics are reported once", (it) => {
  it.effect(
    "flags Effect language service plugins that still report diagnostics in the type check",
    () => flagsPluginsThatStillReport,
  );
  it.effect(
    "passes plugins with diagnostics turned off, configs without the plugin and other plugins",
    () => passesPluginsThatLeaveDiagnosticsToLint,
  );
});
