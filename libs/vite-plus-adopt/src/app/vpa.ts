import {
  Effect,
  FileSystem,
  Option,
  Array as Arr,
  Record as Rec,
  pipe,
  Function as Fn,
} from "effect";
import type { PlatformError } from "effect";

import { loadSection } from "#/entities/vite-config/index.ts";
import { lintCommitMessages } from "#/features/lint-text/index.ts";
import { scanStagedSecrets } from "#/features/scan-secrets/index.ts";
import type { CommandEffect } from "#/shared/lib/command.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import { finish } from "#/shared/lib/output.ts";

import { runAllChecks } from "./run-checks.ts";

const DATA_FIRST_ARITY = 2;

const USAGE = pipe(
  [
    "Usage: vpa                       run every check configured in vite.config.ts",
    "       vpa --staged              scan the staged changes for secrets (pre-commit)",
    "       vpa --commit-msg <file>   lint a commit message (commit-msg)",
    "       vpa --message <text>      lint a message",
  ],
  Arr.join("\n"),
);

const usage: CommandEffect = Effect.fail(checksFailed(USAGE));

const stagedSecrets = (root: string): CommandEffect =>
  loadSection(root, "betterleaks").pipe(
    Effect.flatMap((config) => scanStagedSecrets(config, root)),
    Effect.flatMap(finish),
  );

const lintMessage =
  (
    toMessage: (
      argument: string,
    ) => Effect.Effect<string, PlatformError.PlatformError, FileSystem.FileSystem>,
  ) =>
  (root: string, rest: readonly string[]): CommandEffect =>
    pipe(
      Arr.head(rest),
      Option.match({
        onNone: () => usage,
        onSome: (argument) =>
          Effect.gen(function* lintGiven() {
            const message = yield* toMessage(argument);
            const config = yield* loadSection(root, "commitlint");
            const report = yield* lintCommitMessages(config, root, [message]);
            return yield* finish(report);
          }),
      }),
    );

const readMessage = (
  file: string,
): Effect.Effect<string, PlatformError.PlatformError, FileSystem.FileSystem> =>
  FileSystem.FileSystem.pipe(Effect.flatMap((fs) => fs.readFileString(file)));

const HOOKS: Readonly<Record<string, (root: string, rest: readonly string[]) => CommandEffect>> = {
  "--staged": stagedSecrets,
  "--commit-msg": lintMessage(readMessage),
  "--message": lintMessage(Effect.succeed),
};

/** @internal */
export const runVpa: {
  (args: readonly string[]): (root: string) => CommandEffect;
  (root: string, args: readonly string[]): CommandEffect;
} = Fn.dual(DATA_FIRST_ARITY, (root: string, args: readonly string[]): CommandEffect =>
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
  ),
);
