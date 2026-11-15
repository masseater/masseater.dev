import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkShellScripts } from "./shell-scripts.ts";

const SESSION_START_HOOK = ".claude/hooks/session-start.sh";

const settingsWith = (command: string): string =>
  `{ "hooks": { "SessionStart": [{ "hooks": [{ "type": "command", "command": ${command} }] }] } }`;

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkShellScripts(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsShellFiles = Effect.gen(function* flagsShellFiles() {
  const findings = yield* findingsFor({
    ".github/scripts/release.sh": "gh release create\n",
    "apps/site/scripts/check.bash": "curl -fsS https://example.com\n",
    "tools/fetch": "#!/usr/bin/env bash\ncurl -fsS https://example.com\n",
    "tools/probe": "#!/bin/sh\nexit 0\n",
    "tools/zprobe": "#!/usr/bin/env -S zsh -eu\nexit 0\n",
    "tools/run.ts": "#!/usr/bin/env node\nconsole.log(1);\n",
    "tools/notes": "fetch the runtime first\n",
  });
  expect(findings).toStrictEqual([
    ".github/scripts/release.sh:1 shell-script",
    "apps/site/scripts/check.bash:1 shell-script",
    "tools/fetch:1 shell-script",
    "tools/probe:1 shell-script",
    "tools/zprobe:1 shell-script",
  ]);
});

const passesTheSessionStartHookAndViteHooks = Effect.gen(
  function* passesTheSessionStartHookAndViteHooks() {
    const findings = yield* findingsFor({
      ".claude/settings.json": settingsWith(
        String.raw`"\"$CLAUDE_PROJECT_DIR\"/${SESSION_START_HOOK}"`,
      ),
      [SESSION_START_HOOK]: "#!/bin/bash\nvp install\n",
      ".claude/hooks/gate.sh": "#!/bin/bash\nexit 0\n",
      ".vite-hooks/pre-push": "vp run verify\n",
      "tools/sts2-mcp/vm/host.ps1": "Write-Output 1\n",
    });
    expect(findings).toStrictEqual([".claude/hooks/gate.sh:1 shell-script"]);
  },
);

layer(fixtureLayer)("shell scripts are not kept", (it) => {
  it.effect("flags shell files by extension and by shebang", () => flagsShellFiles);
  it.effect(
    "passes the SessionStart hook, Vite+ hooks and PowerShell",
    () => passesTheSessionStartHookAndViteHooks,
  );
});
