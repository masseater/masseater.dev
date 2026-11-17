import { present } from "@masseater.dev/lint-host";
import { Array as Arr, Effect, Option, Predicate, Record as Rec, pipe } from "effect";

import { reportedSeverity } from "#/entities/rule/index.ts";
import type { CompatRule } from "#/entities/rule/index.ts";
import type { Diagnostic } from "#/shared/config/index.ts";
import { Y8Error, failedWith } from "#/shared/lib/errors.ts";
import type { SourceFile } from "#/shared/native/index.ts";

interface MarkdownlintError {
  readonly lineNumber: number;
  readonly ruleNames: readonly string[];
  readonly ruleDescription: string;
  readonly errorDetail?: string | null;
  readonly errorContext?: string | null;
  readonly errorRange?: readonly [number, number] | null;
}

interface MarkdownlintOptions {
  readonly strings: Readonly<Record<string, string>>;
  readonly config: Readonly<Record<string, unknown>>;
  readonly customRules: readonly unknown[];
}

interface MarkdownlintModule {
  readonly lint: (
    options: MarkdownlintOptions,
  ) => Promise<Readonly<Record<string, readonly MarkdownlintError[]>>>;
}

export interface CompatInput {
  readonly files: readonly SourceFile[];
  readonly rules: readonly CompatRule[];
}

const MARKDOWNLINT = "markdownlint/promise";

const isMarkdownlint = (value: unknown): value is MarkdownlintModule =>
  Predicate.hasProperty(value, "lint") && Predicate.isFunction(value.lint);

const load = Effect.tryPromise({
  try: (): Promise<unknown> => import(MARKDOWNLINT),
  catch: failedWith("markdownlint custom rules need the markdownlint package installed"),
}).pipe(
  Effect.filterOrFail(isMarkdownlint, () =>
    Y8Error.make({ message: `${MARKDOWNLINT} does not export lint` }),
  ),
);

const ruleOf = (
  rules: readonly CompatRule[],
  error: MarkdownlintError,
): Option.Option<CompatRule> =>
  pipe(
    Arr.head(error.ruleNames),
    Option.flatMap((name) =>
      pipe(
        rules,
        Arr.findFirst(({ rule }) => pipe(rule.names, Arr.contains(name))),
      ),
    ),
  );

const rangeFields = (
  error: MarkdownlintError,
): Partial<{ readonly column: number; readonly length: number }> =>
  present(Option.fromNullishOr(error.errorRange), ([column, length]) => ({ column, length }));

const diagnosticOf =
  (path: string, rules: readonly CompatRule[]) =>
  (error: MarkdownlintError): Option.Option<Diagnostic> =>
    pipe(
      ruleOf(rules, error),
      Option.map((rule): Diagnostic => ({
        path,
        line: error.lineNumber,
        rule: rule.id,
        message: error.ruleDescription,
        severity: reportedSeverity(rule.setting),
        ...rangeFields(error),
        ...present(Option.fromNullishOr(error.errorDetail), (detail) => ({ detail })),
        ...present(Option.fromNullishOr(error.errorContext), (context) => ({ context })),
      })),
    );

const settingOf = (rule: CompatRule): unknown =>
  pipe(
    rule.setting.options,
    Option.liftPredicate((options) => !Rec.isEmptyRecord(options)),
    Option.getOrElse((): unknown => true),
  );

const configOf = (rules: readonly CompatRule[]): Readonly<Record<string, unknown>> =>
  pipe(
    rules,
    Arr.flatMap((rule) =>
      pipe(
        Arr.head(rule.rule.names),
        Option.map((name): readonly [string, unknown] => [name, settingOf(rule)]),
        Option.toArray,
      ),
    ),
    Rec.fromEntries,
  );

const optionsOf = (input: CompatInput): MarkdownlintOptions => ({
  strings: pipe(
    input.files,
    Arr.map(({ path, text }): readonly [string, string] => [path, text]),
    Rec.fromEntries,
  ),
  config: { default: false, ...configOf(input.rules) },
  customRules: pipe(
    input.rules,
    Arr.map(({ rule }) => rule),
  ),
});

const diagnosticsOf =
  (rules: readonly CompatRule[]) =>
  ([path, errors]: readonly [string, readonly MarkdownlintError[]]): readonly Diagnostic[] =>
    pipe(
      errors,
      Arr.flatMap((found) => Option.toArray(diagnosticOf(path, rules)(found))),
    );

const run = Effect.fn("y8.markdownlint_rules")(function* run(input: CompatInput) {
  const markdownlint = yield* load;
  const results = yield* Effect.tryPromise({
    try: () => markdownlint.lint(optionsOf(input)),
    catch: failedWith("a markdownlint custom rule failed"),
  });
  return pipe(Rec.toEntries(results), Arr.flatMap(diagnosticsOf(input.rules)));
});

export const runCompatRules = (input: CompatInput): Effect.Effect<readonly Diagnostic[], Y8Error> =>
  Arr.match(input.rules, {
    onEmpty: () => Effect.succeed([]),
    onNonEmpty: () => run(input),
  });
