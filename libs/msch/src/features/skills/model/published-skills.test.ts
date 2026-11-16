import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPublishedSkills } from "./published-skills.ts";

const SKILL = Arr.join("\n")([
  "---",
  "name: run-checks",
  "description: Use when running the checks of this package.",
  "---",
  "",
  "# run-checks",
  "",
  "Run the checks.",
  "",
]);

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    "pnpm-workspace.yaml": "packages:\n  - libs/*\n",
    "package.json": '{ "name": "repo", "private": true }',
    ...files,
  });
  const problems = yield* checkPublishedSkills(root);
  return pipe(
    sortProblems(problems),
    Arr.map((problem) => `${repositoryFiles.relative(root, problem.file)} ${problem.message}`),
  );
});

const flagsPublishedPackagesWithoutSkills = Effect.gen(
  function* flagsPublishedPackagesWithoutSkills() {
    const findings = yield* findingsFor({
      "libs/bare/package.json": '{ "name": "bare", "files": ["dist"] }',
      "libs/private/package.json": '{ "name": "private", "private": true }',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(
      /^libs\/bare\/package\.json is published without TanStack Intent skills/u,
    );
  },
);

const flagsUnshippedSkills = Effect.gen(function* flagsUnshippedSkills() {
  const findings = yield* findingsFor({
    "libs/kit/package.json": '{ "name": "kit", "files": ["dist"] }',
    "libs/kit/skills/run-checks/SKILL.md": SKILL,
  });
  expect(findings).toHaveLength(2);
  expect(Arr.join(findings, "\n")).toContain("lacks the tanstack-intent keyword");
  expect(Arr.join(findings, "\n")).toContain("leaves skills/run-checks out of files");
});

const passesShippedSkills = Effect.gen(function* passesShippedSkills() {
  const findings = yield* findingsFor({
    "libs/kit/package.json":
      '{ "name": "kit", "keywords": ["tanstack-intent"], "files": ["dist", "skills/run-checks"] }',
    "libs/kit/skills/run-checks/SKILL.md": SKILL,
  });
  expect(findings).toStrictEqual([]);
});

const flagsInvalidSkills = Effect.gen(function* flagsInvalidSkills() {
  const findings = yield* findingsFor({
    "libs/kit/package.json": '{ "name": "kit", "keywords": ["tanstack-intent"] }',
    "libs/kit/skills/run-checks/SKILL.md": "# run-checks\n",
  });
  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatch(/^libs\/kit\/skills fails intent validate/u);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))(
  "published packages ship TanStack Intent skills",
  (it) => {
    it.effect(
      "flags a published package without skills",
      () => flagsPublishedPackagesWithoutSkills,
    );
    it.effect("flags skills that the package does not publish", () => flagsUnshippedSkills);
    it.effect("passes skills that the package publishes", () => passesShippedSkills);
    it.effect("flags skills that intent validate rejects", () => flagsInvalidSkills);
  },
);
