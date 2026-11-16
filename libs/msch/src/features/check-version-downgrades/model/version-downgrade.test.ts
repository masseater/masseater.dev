import { layer } from "@effect/vitest";
import { Array as Arr, ConfigProvider, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import {
  changedRepositoryWith,
  fixtureLayer,
  gitRepositoryWith,
} from "#/shared/lib/repository.test.support.ts";

import { checkRenovateSettings } from "./renovate-settings.ts";
import { checkDowngrades } from "./version-downgrade.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const withBase = ConfigProvider.fromUnknown({ VPA_BASE: "HEAD" });

const flagsDowngrades = Effect.gen(function* flagsDowngrades() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* changedRepositoryWith(
    {
      "package.json": lines([
        "{",
        '  "dependencies": { "effect": "^4.1.2", "kept": "1.0.0" },',
        '  "engines": { "node": ">=26" },',
        '  "packageManager": "pnpm@12.20.0"',
        "}",
      ]),
      "pnpm-workspace.yaml": lines(["catalog:", "  semver: 7.8.6", "  raised: 1.0.0"]),
      "Cargo.toml": lines(["[dependencies]", 'serde = "1.0.220"']),
    },
    {
      "package.json": lines([
        "{",
        '  "dependencies": { "effect": "^4.0.0", "kept": "1.0.0", "added": "0.1.0" },',
        '  "engines": { "node": ">=24" },',
        '  "packageManager": "pnpm@12.20.0"',
        "}",
      ]),
      "pnpm-workspace.yaml": lines(["catalog:", "  semver: 7.7.0", "  raised: 2.0.0"]),
      "Cargo.toml": lines(["[dependencies]", 'serde = { version = "1.0.200" }']),
    },
  );
  const problems = yield* checkDowngrades(root).pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, withBase),
  );
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    "Cargo.toml:2 version-downgrade",
    "package.json:2 version-downgrade",
    "package.json:3 version-downgrade",
    "pnpm-workspace.yaml:2 version-downgrade",
  ]);
});

const flagsRenovateSettings = Effect.gen(function* flagsRenovateSettings() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    "renovate.json": lines([
      "{",
      '  "platformAutomerge": false,',
      '  "packageRules": [',
      '    { "matchPackageNames": ["python"], "allowedVersions": "<3.15" },',
      '    { "matchPackageNames": ["node"], "allowedVersions": "/^24/" }',
      "  ]",
      "}",
    ]),
  });
  const problems = yield* checkRenovateSettings(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    "renovate.json:2 renovate-platform-automerge",
    "renovate.json:4 renovate-version-cap",
  ]);
});

layer(fixtureLayer)("version downgrade", (it) => {
  it.effect("flags versions lower than the base commit's", () => flagsDowngrades);
  it.effect("flags Renovate caps and turned-off platform automerge", () => flagsRenovateSettings);
});
