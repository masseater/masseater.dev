import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSkillFiles } from "./skill-files.ts";

const COMMIT = "5dbbf4abd9b3a5b1a74bc30c89ca7bd6712bd929";
const ORIGIN = "https://github.com/example/skills";

const skillWith = (frontmatter: readonly string[], body: readonly string[]): string =>
  pipe(["---", ...frontmatter, "---", "", ...body, ""], Arr.join("\n"));

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkSkillFiles(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsFrontmatterThatBreaksTheFormat = Effect.gen(
  function* flagsFrontmatterThatBreaksTheFormat() {
    const findings = yield* findingsFor({
      "skills/renamed/SKILL.md": skillWith(
        ["name: old-name", "description: Use when renaming."],
        ["# old-name"],
      ),
      "skills/titled/SKILL.md": skillWith(
        ["name: titled", "description: Use when titling.", "license: MIT"],
        ["# Titled Skill"],
      ),
      "skills/titled/LICENSE": "MIT\n",
      "skills/derived/SKILL.md": skillWith(
        [
          "name: derived",
          "description: Use when deriving.",
          "metadata:",
          "  derived-from: >-",
          `    ${ORIGIN}/blob/${COMMIT}/a/SKILL.md`,
          `    ${ORIGIN}/tree/main/b`,
          "    https://example.com/article",
        ],
        ["# derived"],
      ),
    });
    expect(findings).toStrictEqual([
      "skills/derived/SKILL.md:7 skill-file",
      "skills/renamed/SKILL.md:2 skill-file",
      "skills/titled/LICENSE:1 skill-file",
      "skills/titled/SKILL.md:4 skill-file",
      "skills/titled/SKILL.md:7 skill-file",
    ]);
  },
);

const flagsLinksToMissingFiles = Effect.gen(function* flagsLinksToMissingFiles() {
  const findings = yield* findingsFor({
    "skills/linked/SKILL.md": skillWith(
      ["name: linked", "description: Use when linking."],
      [
        "# linked",
        "",
        "- [`fsd`](references/fsd.md)",
        "- [`gone`](references/gone.md)",
        "- [docs](https://example.com/docs) and [top](#linked)",
        "- `[sample](sample.md)` is how a link is written.",
      ],
    ),
    "skills/linked/references/fsd.md":
      "# fsd\n\nSee [`check`](../usecases/check.md#steps) and [`lost`](../usecases/lost.md).\n",
    "skills/linked/usecases/check.md": "# check\n",
  });
  expect(findings).toStrictEqual([
    "skills/linked/SKILL.md:9 skill-file",
    "skills/linked/references/fsd.md:3 skill-file",
  ]);
});

const passesWellFormedAndInstalledSkills = Effect.gen(
  function* passesWellFormedAndInstalledSkills() {
    const findings = yield* findingsFor({
      "skills/plain/SKILL.md": skillWith(
        [
          "name: plain",
          "description: Use when nothing is wrong.",
          "metadata:",
          `  derived-from: ${ORIGIN}/tree/${COMMIT}/plain`,
        ],
        ["# plain", "", "- [`steps`](usecases/steps.md)"],
      ),
      "skills/plain/usecases/steps.md": "# steps\n",
      ".agents/skills/vendor/SKILL.md": skillWith(
        ["name: other", "description: Installed.", "license: MIT"],
        ["# Vendor"],
      ),
    });
    expect(findings).toStrictEqual([]);
  },
);

layer(fixtureLayer)("skill files follow skill-authoring", (it) => {
  it.effect(
    "flags a name, heading, license or derived-from that breaks the format",
    () => flagsFrontmatterThatBreaksTheFormat,
  );
  it.effect("flags links to files that do not exist", () => flagsLinksToMissingFiles);
  it.effect(
    "passes well-formed skills and installed copies",
    () => passesWellFormedAndInstalledSkills,
  );
});
