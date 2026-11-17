import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPublishTrigger } from "./publish-trigger.ts";
import { checkReleasePlease } from "./release-please.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const locate = Effect.fn("locate")(function* locate(
  root: string,
  problems: readonly { readonly file: string; readonly line: number; readonly rule: string }[],
) {
  const repositoryFiles = yield* RepositoryFiles;
  return pipe(
    problems,
    Arr.map((problem) => ({ ...problem, column: 1, message: "" })),
    sortProblems,
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsReleasePlease = Effect.gen(function* flagsReleasePlease() {
  const root = yield* gitRepositoryWith({
    ".github/workflows/release.yml": lines([
      "on: push",
      "jobs:",
      "  please:",
      "    steps:",
      "      - uses: googleapis/release-please-action@v5",
      "      - uses: actions/checkout@v7",
    ]),
    "apps/app/release-please-config.json": "{}\n",
    "apps/app/.release-please-manifest.json": "{}\n",
    "apps/app/package.json": "{}\n",
  });
  const problems = yield* checkReleasePlease(root);
  const located = yield* locate(root, problems);
  expect(located).toStrictEqual([
    ".github/workflows/release.yml:5 release-please",
    "apps/app/.release-please-manifest.json:1 release-please",
    "apps/app/release-please-config.json:1 release-please",
  ]);
});

const flagsAutomaticPublishing = Effect.gen(function* flagsAutomaticPublishing() {
  const root = yield* gitRepositoryWith({
    ".github/workflows/manual.yml": lines([
      "on:",
      "  workflow_dispatch:",
      "jobs:",
      "  npm:",
      "    steps:",
      '      - run: vp exec msch-publish npm "$DIRECTORY"',
    ]),
    ".github/workflows/push.yml": lines([
      "on:",
      "  push:",
      "  workflow_dispatch:",
      "jobs:",
      "  npm:",
      "    steps:",
      '      - run: vp exec msch-publish npm "$DIRECTORY"',
    ]),
    ".github/workflows/verify.yml": lines([
      "on: [push]",
      "jobs:",
      "  verify:",
      "    steps:",
      "      - run: vp run verify",
    ]),
  });
  const problems = yield* checkPublishTrigger(root);
  const located = yield* locate(root, problems);
  expect(located).toStrictEqual([".github/workflows/push.yml:1 publish-trigger"]);
});

layer(fixtureLayer)("release triggers", (it) => {
  it.effect("flags release-please steps and files", () => flagsReleasePlease);
  it.effect("flags msch-publish outside workflow_dispatch", () => flagsAutomaticPublishing);
});
