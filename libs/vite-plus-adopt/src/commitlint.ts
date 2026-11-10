import format from "@commitlint/format";
import lint from "@commitlint/lint";
import load from "@commitlint/load";
import type { LintOptions, QualifiedConfig } from "@commitlint/types";
import { Array as Arr, Effect, FileSystem, Option, Predicate, pipe } from "effect";
import type { PlatformError } from "effect";

import { attempt } from "./attempt.ts";
import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";
import type { CommitlintConfig } from "./types.ts";

const COMMENT_CHAR = "#";

const parserOptionsOf = (loaded: QualifiedConfig): NonNullable<LintOptions["parserOpts"]> => {
  const preset = pipe(
    Option.fromNullishOr(loaded.parserPreset),
    Option.map(({ parserOpts }) => parserOpts),
    Option.filter(Predicate.isObject),
    Option.getOrElse(() => ({})),
  );
  return { ...preset, commentChar: COMMENT_CHAR };
};

const lintOptionsOf = (loaded: QualifiedConfig): LintOptions => ({
  parserOpts: parserOptionsOf(loaded),
  plugins: loaded.plugins,
  ignores: loaded.ignores ?? [],
  defaultIgnores: loaded.defaultIgnores ?? true,
});

const lintCommitMessages = (
  config: CommitlintConfig,
  root: string,
  messages: readonly string[],
): Effect.Effect<Report, VpToolsError> =>
  Effect.gen(function* lintMessages() {
    const loaded = yield* attempt("commitlint")(() => load(config, { cwd: root }));
    const results = yield* pipe(
      messages,
      Effect.forEach((message) =>
        attempt("commitlint")(() => lint(message, loaded.rules, lintOptionsOf(loaded))),
      ),
    );
    return {
      valid: pipe(
        results,
        Arr.every((result) => result.valid),
      ),
      output: format({ results }, { color: false }),
    };
  });

const lintCommitMessageFile = (
  config: CommitlintConfig,
  root: string,
  messageFile: string,
): Effect.Effect<Report, VpToolsError | PlatformError.PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* read() {
    const fs = yield* FileSystem.FileSystem;
    const message = yield* fs.readFileString(messageFile);
    return yield* lintCommitMessages(config, root, [message]);
  });

export { lintCommitMessageFile, lintCommitMessages };
