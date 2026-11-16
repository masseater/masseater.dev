import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSkillEntry } from "./skill-entry.ts";

const CONFIG = "vite.config.ts";
const RENOVATE = "renovate.json";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const EXTENDS =
  '{ "extends": ["github>masseater/masseater.dev//libs/vite-plus-adopt/renovate"] }\n';

const configWith = (sources: readonly string[]): string =>
  pipe(["export default {", "  skills: {", ...sources, "  },", "};", ""], Arr.join("\n"));

const ALL = `    "masseater/skills": { commit: "${COMMIT}", skills: "all" },`;
const NAMED = `    "masseater/skills": { commit: "${COMMIT}", skills: ["vite-plus"] },`;
const OTHER = `    "example/skills": { commit: "${COMMIT}", skills: ["effect-ts"] },`;
const LOCAL = `    "./docs/skills": { skills: "all" },`;
const HIDDEN = `    "example/skills": { skills: ["effect-ts"], commit: "${COMMIT}" },`;

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

const flagsNamedOrMissingEcosystemSkills = Effect.gen(
  function* flagsNamedOrMissingEcosystemSkills() {
    const named = yield* findingsFor({ [CONFIG]: configWith([NAMED]), [RENOVATE]: EXTENDS });
    const missing = yield* findingsFor({ [CONFIG]: configWith([OTHER]), [RENOVATE]: EXTENDS });
    expect([named, missing]).toStrictEqual([
      [
        expect.stringMatching(
          /^vite\.config\.ts:3 unlocked-skill picks skills from masseater\/skills by name/u,
        ),
      ],
      [
        expect.stringMatching(
          /^vite\.config\.ts:2 unlocked-skill does not install masseater\/skills/u,
        ),
      ],
    ]);
  },
);

const flagsSourcesRenovateCannotRead = Effect.gen(function* flagsSourcesRenovateCannotRead() {
  const hidden = yield* findingsFor({ [CONFIG]: configWith([ALL, HIDDEN]), [RENOVATE]: EXTENDS });
  const noPreset = yield* findingsFor({ [CONFIG]: configWith([ALL]), [RENOVATE]: "{}\n" });
  expect([hidden, noPreset]).toStrictEqual([
    [expect.stringMatching(/^vite\.config\.ts:4 skill-source-visible declares example\/skills/u)],
    [expect.stringMatching(/^renovate\.json:1 skill-source-visible does not extend/u)],
  ]);
});

const passesACompleteSectionAndNoSection = Effect.gen(
  function* passesACompleteSectionAndNoSection() {
    const complete = yield* findingsFor({
      [CONFIG]: configWith([ALL, OTHER, LOCAL]),
      [RENOVATE]: EXTENDS,
    });
    const noSection = yield* findingsFor({ [CONFIG]: "export default {};\n" });
    const noConfig = yield* findingsFor({ "README.md": "# x\n" });
    expect([complete, noSection, noConfig]).toStrictEqual([[], [], []]);
  },
);

layer(fixtureLayer)("the skills section in vite.config.ts", (it) => {
  it.effect(
    "flags masseater/skills picked by name or not installed",
    () => flagsNamedOrMissingEcosystemSkills,
  );
  it.effect(
    "flags sources the Renovate preset cannot read and a missing preset",
    () => flagsSourcesRenovateCannotRead,
  );
  it.effect(
    "passes a complete section and a repository without one",
    () => passesACompleteSectionAndNoSection,
  );
});
