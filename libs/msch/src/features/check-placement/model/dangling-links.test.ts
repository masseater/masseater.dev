import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Record as Rec, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { checkDanglingLinks } from "./dangling-links.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
  links: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* directoryWith(files);
  yield* Effect.forEach(
    Rec.toEntries(links),
    ([link, target]) => fixtures.symlink(target, repositoryFiles.join(root, link)),
    { discard: true },
  );
  yield* fixtures.commitAll(root);
  const problems = yield* checkDanglingLinks(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsLinksToUntrackedTargets = Effect.gen(function* flagsLinksToUntrackedTargets() {
  const findings = yield* findingsFor(
    { ".gitignore": ".agents/skills/*\n", ".agents/skills/vite-plus/SKILL.md": "# vite-plus\n" },
    { ".claude/skills": "../.agents/skills", ".codex/skills": "../.missing/skills" },
  );
  expect(findings).toStrictEqual([
    ".claude/skills:1 dangling-link",
    ".codex/skills:1 dangling-link",
  ]);
});

const passesLinksToTrackedTargets = Effect.gen(function* passesLinksToTrackedTargets() {
  const findings = yield* findingsFor(
    {
      ".gitignore": ".agents/skills/*\n!.agents/skills/.gitkeep\n",
      ".agents/skills/.gitkeep": "",
      "AGENTS.md": "# AGENTS.md\n",
    },
    { ".claude/skills": "../.agents/skills", "CLAUDE.md": "AGENTS.md" },
  );
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("links point at tracked files", (it) => {
  it.effect("flags links whose target holds no tracked file", () => flagsLinksToUntrackedTargets);
  it.effect("passes links to tracked files and directories", () => passesLinksToTrackedTargets);
});
