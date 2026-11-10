import { Effect, Option, Path, Array as Arr, Record as Rec, pipe } from "effect";
import type { LintError, Options } from "markdownlint";
import { lint } from "markdownlint/promise";

import { attempt } from "./attempt.ts";
import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";
import type { MarkdownlintConfig } from "./types.ts";

const formatError =
  (file: string) =>
  (error: LintError): string => {
    const detail = pipe(
      [error.errorDetail, error.errorContext],
      Arr.filter((part): part is string => part !== null && part !== ""),
      Arr.map((part) => ` [${part}]`),
      Arr.join(""),
    );
    return `${file}:${error.lineNumber} ${Arr.join(error.ruleNames, "/")} ${error.ruleDescription}${detail}`;
  };

const optionsOf = (config: MarkdownlintConfig, files: readonly string[]): Options => ({
  files: [...files],
  ...pipe(
    Option.fromNullishOr(config.config),
    Option.match({ onNone: () => ({}), onSome: (rules) => ({ config: rules }) }),
  ),
  ...pipe(
    Option.fromNullishOr(config.customRules),
    Option.match({ onNone: () => ({}), onSome: (rules) => ({ customRules: [...rules] }) }),
  ),
});

const lintMarkdown = (
  config: MarkdownlintConfig,
  root: string,
  files: readonly string[],
): Effect.Effect<Report, VpToolsError, Path.Path> =>
  Effect.gen(function* markdown() {
    const path = yield* Path.Path;
    const absolute = pipe(
      files,
      Arr.map((file) => path.join(root, file)),
    );
    const results = yield* attempt("markdownlint")(() => lint(optionsOf(config, absolute)));
    const linesOf = ([file, errors]: readonly [
      string,
      readonly LintError[],
    ]): readonly string[] => {
      const format = formatError(path.relative(root, file));
      return pipe(errors, Arr.map(format));
    };
    const lines = pipe(Rec.toEntries(results), Arr.flatMap(linesOf));
    return { valid: Arr.isArrayEmpty(lines), output: Arr.join(lines, "\n") };
  });

export { lintMarkdown };
