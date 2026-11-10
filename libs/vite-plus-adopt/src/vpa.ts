import { Effect, Option, Array as Arr, Record as Rec, pipe } from "effect";

import type { CommandEffect } from "./command.ts";
import { lintCommitMessageFile } from "./commitlint.ts";
import { loadSection } from "./config.ts";
import { checksFailed } from "./errors.ts";
import { finish } from "./output.ts";
import { runAllChecks } from "./run-checks.ts";
import { scanStagedSecrets } from "./secret-checks.ts";

const USAGE = pipe(
  [
    "Usage: vpa                       run every check configured in vite.config.ts",
    "       vpa --staged              scan the staged changes for secrets (pre-commit)",
    "       vpa --commit-msg <file>   lint a commit message (commit-msg)",
  ],
  Arr.join("\n"),
);

const usage: CommandEffect = Effect.fail(checksFailed(USAGE));

const stagedSecrets = (root: string): CommandEffect =>
  loadSection(root, "betterleaks").pipe(
    Effect.flatMap((config) => scanStagedSecrets(config, root)),
    Effect.flatMap(finish),
  );

const commitMessage = (root: string, rest: readonly string[]): CommandEffect =>
  pipe(
    Arr.head(rest),
    Option.match({
      onNone: () => usage,
      onSome: (file) =>
        loadSection(root, "commitlint").pipe(
          Effect.flatMap((config) => lintCommitMessageFile(config, root, file)),
          Effect.flatMap(finish),
        ),
    }),
  );

const HOOKS: Readonly<Record<string, (root: string, rest: readonly string[]) => CommandEffect>> = {
  "--staged": stagedSecrets,
  "--commit-msg": commitMessage,
};

const runVpa = (root: string, args: readonly string[]): CommandEffect =>
  pipe(
    args,
    Arr.match({
      onEmpty: () => runAllChecks(root),
      onNonEmpty: ([flag, ...rest]) =>
        pipe(
          Rec.get(HOOKS, flag),
          Option.match({ onNone: () => usage, onSome: (hook) => hook(root, rest) }),
        ),
    }),
  );

export { runVpa };
