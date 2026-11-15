import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSkillEntry } from "./skill-entry.ts";

const LOCK = "skills-lock.json";
const ENTRY = ".agents/skills/masseater-ecosystem/SKILL.md";
const OURS = "masseater/skills";

const lockWith = (skills: readonly (readonly [name: string, source: string])[]): string =>
  pipe(
    [
      "{",
      '  "version": 2,',
      '  "skills": {',
      pipe(
        skills,
        Arr.map(([name, source]) => `    "${name}": { "source": "${source}" }`),
        Arr.join(",\n"),
      ),
      "  }",
      "}",
      "",
    ],
    Arr.join("\n"),
  );

const entryNaming = (lines: readonly string[]): string =>
  pipe(
    [
      "---",
      "name: masseater-ecosystem",
      "description: Use first.",
      "---",
      "",
      "# masseater-ecosystem",
      "",
      "- See [`tech-stack`](references/tech-stack.md).",
      ...lines,
      "",
    ],
    Arr.join("\n"),
  );

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkSkillEntry(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule} ${problem.message}`,
    ),
  );
});

const flagsSkillsTheEntryNamesButTheLockLacks = Effect.gen(
  function* flagsSkillsTheEntryNamesButTheLockLacks() {
    const findings = yield* findingsFor({
      [LOCK]: lockWith([
        ["effect-ts", "example/skills"],
        ["masseater-ecosystem", OURS],
        ["repo-conventions", OURS],
        ["writing", "example/skills"],
      ]),
      [ENTRY]: entryNaming([
        "- Always: `repo-conventions` and `vite-plus`",
        "- Prose: `writing`. `writing` builds on `repo-conventions`.",
      ]),
    });
    expect(findings).toStrictEqual([
      expect.stringMatching(/^skills-lock\.json:5 unlocked-skill .* read vite-plus, /u),
      expect.stringMatching(/^skills-lock\.json:5 unlocked-skill .* read writing, /u),
    ]);
  },
);

const flagsOurSkillsWithoutTheEntry = Effect.gen(function* flagsOurSkillsWithoutTheEntry() {
  const findings = yield* findingsFor({
    [LOCK]: lockWith([
      ["effect-ts", "example/skills"],
      ["vite-plus", OURS],
    ]),
  });
  expect(findings).toStrictEqual([
    expect.stringMatching(/^skills-lock\.json:5 unlocked-skill .* without masseater-ecosystem, /u),
  ]);
});

const passesCompleteAndUnrelatedLocks = Effect.gen(function* passesCompleteAndUnrelatedLocks() {
  const complete = yield* findingsFor({
    [LOCK]: lockWith([
      ["masseater-ecosystem", OURS],
      ["vite-plus", OURS],
    ]),
    [ENTRY]: entryNaming(["- Always: `vite-plus`"]),
  });
  const notInstalled = yield* findingsFor({
    [LOCK]: lockWith([["masseater-ecosystem", OURS]]),
  });
  const unrelated = yield* findingsFor({
    [LOCK]: lockWith([["effect-ts", "example/skills"]]),
    [ENTRY]: entryNaming(["- Always: `vite-plus`"]),
  });
  const noLock = yield* findingsFor({ [ENTRY]: entryNaming(["- Always: `vite-plus`"]) });
  expect([complete, notInstalled, unrelated, noLock]).toStrictEqual([[], [], [], []]);
});

layer(fixtureLayer)("skills-lock.json installs what masseater-ecosystem names", (it) => {
  it.effect(
    "flags a skill the entry names that the lock does not install",
    () => flagsSkillsTheEntryNamesButTheLockLacks,
  );
  it.effect(
    "flags skills from masseater/skills installed without the entry",
    () => flagsOurSkillsWithoutTheEntry,
  );
  it.effect(
    "passes a complete lock, an uninstalled entry and a lock without our skills",
    () => passesCompleteAndUnrelatedLocks,
  );
});
