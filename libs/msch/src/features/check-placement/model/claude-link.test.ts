import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Record as Rec, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { checkClaudeLinks } from "./claude-link.ts";

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
    { concurrency: 1, discard: true },
  );
  yield* fixtures.commitAll(root);
  const problems = yield* checkClaudeLinks(root);
  return pipe(
    sortProblems(problems),
    Arr.map((problem) => `${repositoryFiles.relative(root, problem.file)} ${problem.message}`),
  );
});

const AGENTS = "# repo\n";

const flagsCopiesAndOtherTargets = Effect.gen(function* flagsCopiesAndOtherTargets() {
  const findings = yield* findingsFor(
    { "AGENTS.md": AGENTS, "CLAUDE.md": "@AGENTS.md\n", "apps/site/README.md": "# site\n" },
    { "apps/site/CLAUDE.md": "README.md" },
  );
  expect(findings).toStrictEqual([
    "CLAUDE.md CLAUDE.md must be a symbolic link to AGENTS.md",
    "apps/site/CLAUDE.md CLAUDE.md must be a symbolic link to AGENTS.md",
  ]);
});

const passesLinksToAgents = Effect.gen(function* passesLinksToAgents() {
  const findings = yield* findingsFor(
    { "AGENTS.md": AGENTS, "apps/site/AGENTS.md": "# site\n" },
    { "CLAUDE.md": "AGENTS.md", "apps/site/CLAUDE.md": "AGENTS.md" },
  );
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("CLAUDE.md links to AGENTS.md", (it) => {
  it.effect(
    "flags a CLAUDE.md that is a file or links elsewhere",
    () => flagsCopiesAndOtherTargets,
  );
  it.effect("passes a CLAUDE.md that links to AGENTS.md", () => passesLinksToAgents);
});
