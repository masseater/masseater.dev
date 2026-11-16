import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkMissingHooks } from "./missing-hooks.ts";

const PROJECT = "CLAUDE_PROJECT_DIR";
const PLUGIN = "CLAUDE_PLUGIN_ROOT";

const hooksWith = (lines: readonly string[]): string =>
  `{\n  "hooks": {\n    "Stop": [\n      {\n        "hooks": [\n${Arr.join(lines, ",\n")}\n        ]\n      }\n    ]\n  }\n}\n`;

const nodeHook = (argument: string): string =>
  `          { "type": "command", "command": "node", "args": ["${argument}"] }`;

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkMissingHooks(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsHooksThatRunMissingFiles = Effect.gen(function* flagsHooksThatRunMissingFiles() {
  const findings = yield* findingsFor({
    ".claude/settings.json": hooksWith([
      nodeHook(`\${${PROJECT}}/.claude/hooks/stop-gate.ts`),
      nodeHook(`\${${PROJECT}}/.claude/hooks/removed.ts`),
      String.raw`          { "type": "command", "command": "\"$${PROJECT}\"/.claude/hooks/gone.sh" }`,
    ]),
    ".claude/hooks/stop-gate.ts": "export {};\n",
    "plugins/translate/hooks/hooks.json": hooksWith([
      nodeHook(`\${${PLUGIN}}/hooks/session-start.ts`),
      nodeHook(`\${${PLUGIN}}/hooks/renamed.ts`),
    ]),
    "plugins/translate/hooks/session-start.ts": "export {};\n",
  });
  expect(findings).toStrictEqual([
    ".claude/settings.json:7 missing-hook",
    ".claude/settings.json:8 missing-hook",
    "plugins/translate/hooks/hooks.json:7 missing-hook",
  ]);
});

const passesOptionalFilesAndOtherSettings = Effect.gen(
  function* passesOptionalFilesAndOtherSettings() {
    const findings = yield* findingsFor({
      ".claude/settings.json": hooksWith([
        `          { "type": "command", "command": "node", "args": ["--env-file-if-exists=\${${PROJECT}}/.env", "\${${PROJECT}}/.claude/hooks/post-edit.ts"] }`,
      ]),
      ".claude/hooks/post-edit.ts": "export {};\n",
      "docs/settings.json": hooksWith([nodeHook(`\${${PROJECT}}/.claude/hooks/removed.ts`)]),
      ".gitignore": "dist\n",
      "plugins/built/hooks/hooks.json": hooksWith([nodeHook(`\${${PLUGIN}}/dist/main.mjs`)]),
    });
    expect(findings).toStrictEqual([]);
  },
);

layer(fixtureLayer)("hooks run files that exist", (it) => {
  it.effect(
    "flags project and plugin hooks that run a missing file",
    () => flagsHooksThatRunMissingFiles,
  );
  it.effect(
    "passes optional env files, ignored build outputs and files that are not hook settings",
    () => passesOptionalFilesAndOtherSettings,
  );
});
