import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkReplacedTools } from "./replaced-tools.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkReplacedTools(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsSettingsOfReplacedTools = Effect.gen(function* flagsSettingsOfReplacedTools() {
  const findings = yield* findingsFor({
    "turbo.json": "{}\n",
    ".husky/pre-commit": "vp staged\n",
    "lefthook.yml": "pre-push: {}\n",
    "knip.json": "{}\n",
    ".jscpd.json": "{}\n",
    ".eslintrc.cjs": "module.exports = {};\n",
    "apps/web/eslint.config.ts": "export default [];\n",
    ".prettierrc": "{}\n",
    "jest.config.ts": "export default {};\n",
    "apps/web/wrangler.jsonc": "{}\n",
    "infra/main.tf": "\n",
    ".claude/rules/style.md": "# style\n",
  });
  expect(findings).toStrictEqual([
    ".claude/rules/style.md:1 replaced-tool",
    ".eslintrc.cjs:1 replaced-tool",
    ".husky/pre-commit:1 replaced-tool",
    ".jscpd.json:1 replaced-tool",
    ".prettierrc:1 replaced-tool",
    "apps/web/eslint.config.ts:1 replaced-tool",
    "apps/web/wrangler.jsonc:1 replaced-tool",
    "infra/main.tf:1 replaced-tool",
    "jest.config.ts:1 replaced-tool",
    "knip.json:1 replaced-tool",
    "lefthook.yml:1 replaced-tool",
    "turbo.json:1 replaced-tool",
  ]);
});

const passesTheToolsInUse = Effect.gen(function* passesTheToolsInUse() {
  const findings = yield* findingsFor({
    "vite.config.ts": "export default {};\n",
    ".vite-hooks/pre-push": "vp run verify\n",
    ".fallowrc.jsonc": "{}\n",
    "apps/web/alchemy.run.ts": "export default {};\n",
    "apps/web/src/shared/lib/turbo.json.ts": "export const turbo = 1;\n",
    "docs/wrangler.md": "wrangler は使わない。\n",
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("settings of replaced tools are not kept", (it) => {
  it.effect("flags the settings of tools the stack replaced", () => flagsSettingsOfReplacedTools);
  it.effect("passes the settings of the tools in use", () => passesTheToolsInUse);
});
