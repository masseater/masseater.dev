import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkGitSubpath } from "./git-subpath.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkGitSubpath(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const manifest = (name: string, specifier: string): string =>
  `{\n  "name": "fixture",\n  "dependencies": {\n    "${name}": "${specifier}"\n  }\n}\n`;

const flagsSubpathSpecifiers = Effect.gen(function* flagsSubpathSpecifiers() {
  const findings = yield* findingsFor({
    "package.json": manifest("deck", "github:owner/skills#path:/assets/deck"),
    "apps/site/package.json": manifest(
      "rule",
      "git+https://github.com/owner/repo.git#main&path:/libs/rule",
    ),
    "pnpm-workspace.yaml": "catalog:\n  ui: github:owner/repo#path:/libs/ui\n",
  });
  expect(findings).toStrictEqual([
    "apps/site/package.json:4 git-subpath-dependency",
    "package.json:4 git-subpath-dependency",
    "pnpm-workspace.yaml:2 git-subpath-dependency",
  ]);
});

const allowsOtherSpecifiers = Effect.gen(function* allowsOtherSpecifiers() {
  const findings = yield* findingsFor({
    "package.json": manifest("fork", "github:owner/repo#v1.0.0"),
    "apps/site/package.json": manifest("ui", "workspace:*"),
    "pnpm-workspace.yaml": "# path: comments stay allowed\ncatalog:\n  effect: 4.1.2\n",
    "docs/setup.ts": 'export const spec = "github:owner/repo#path:/libs/ui";\n',
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("checkGitSubpath", (it) => {
  it.effect(
    "flags git subpath specifiers in manifests and the workspace file",
    () => flagsSubpathSpecifiers,
  );
  it.effect("allows registry, workspace and plain git specifiers", () => allowsOtherSpecifiers);
});
