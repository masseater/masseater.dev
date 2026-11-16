import { Array as Arr, Boolean as Bool, Effect, Match, Option, Order, pipe } from "effect";

import { BUILTIN, resolve, unknownPlugins } from "#/entities/rule/index.ts";
import type { Resolved } from "#/entities/rule/index.ts";
import { runCompatRules } from "#/features/run-compat-rules/index.ts";
import { runScriptRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, MdlintConfig } from "#/shared/config/index.ts";
import { MdlintError } from "#/shared/lib/errors.ts";
import { present } from "#/shared/lib/present.ts";
import { native } from "#/shared/native/index.ts";
import type {
  NativeDiagnostic,
  NativeOptions,
  NativeResult,
  SourceFile,
} from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: MdlintConfig;
}

const SAMPLED = "01";
const NOT_SAMPLED = "00";

type RangeFields = Partial<{ readonly column: number; readonly length: number }>;

const rangeOf = (diagnostic: NativeDiagnostic): RangeFields =>
  present(Option.fromNullishOr(diagnostic.range), ([column, length]) => ({ column, length }));

const severityOf = (diagnostic: NativeDiagnostic): Diagnostic["severity"] =>
  Match.value(diagnostic.severity).pipe(
    Match.when("warning", (): Diagnostic["severity"] => "warn"),
    Match.orElse((): Diagnostic["severity"] => "error"),
  );

const fromNative =
  (path: string) =>
  (diagnostic: NativeDiagnostic): Diagnostic => ({
    path,
    line: diagnostic.line,
    rule: `${BUILTIN}/${Option.getOrElse(Arr.head(diagnostic.ruleNames), () => "")}`,
    message: diagnostic.description,
    severity: severityOf(diagnostic),
    ...rangeOf(diagnostic),
    ...present(Option.fromNullishOr(diagnostic.detail), (detail) => ({ detail })),
    ...present(Option.fromNullishOr(diagnostic.context), (context) => ({ context })),
  });

const byPosition = Order.combine(
  Order.mapInput(Order.String, (diagnostic: Diagnostic) => diagnostic.path),
  Order.mapInput(Order.Number, (diagnostic: Diagnostic) => diagnostic.line),
);

const flagsOf = (sampled: boolean): string =>
  Bool.match(sampled, { onFalse: () => NOT_SAMPLED, onTrue: () => SAMPLED });

const traceparent = Effect.currentSpan.pipe(
  Effect.map((span) => `00-${span.traceId}-${span.spanId}-${flagsOf(span.sampled)}`),
  Effect.option,
);

const needsText = (resolved: Resolved): boolean =>
  Arr.isReadonlyArrayNonEmpty(resolved.scripts) || Arr.isReadonlyArrayNonEmpty(resolved.compat);

const nativeOptions = (resolved: Resolved, config: MdlintConfig): Effect.Effect<NativeOptions> =>
  traceparent.pipe(
    Effect.map((parent): NativeOptions => ({
      config: resolved.core,
      inlineConfig: config.inlineConfig ?? true,
      keepTree: Arr.isReadonlyArrayNonEmpty(resolved.scripts),
      keepText: needsText(resolved),
      ...present(parent, (value) => ({ traceparent: value })),
    })),
  );

const runNative = (
  input: LintInput,
  options: NativeOptions,
): Effect.Effect<readonly NativeResult[]> =>
  Effect.sync(() => native.lintPaths(input.root, input.files, options)).pipe(
    Effect.withSpan("mdlint.native", { attributes: { "mdlint.files": input.files.length } }),
  );

const sourceOf = (result: NativeResult): Option.Option<SourceFile> =>
  pipe(
    Option.fromNullishOr(result.text),
    Option.map((text): SourceFile => ({ path: result.path, text })),
  );

const scriptedOne =
  (resolved: Resolved) =>
  (result: NativeResult): readonly Diagnostic[] =>
    pipe(
      Option.all({ tree: Option.fromNullishOr(result.tree), source: sourceOf(result) }),
      Option.map(({ tree, source }) =>
        runScriptRules({ path: source.path, text: source.text, tree, rules: resolved.scripts }),
      ),
      Option.getOrElse((): readonly Diagnostic[] => []),
    );

const builtinOf = (result: NativeResult): readonly Diagnostic[] =>
  pipe(result.diagnostics, Arr.map(fromNative(result.path)));

const checkPlugins = (config: MdlintConfig): Effect.Effect<void, MdlintError> =>
  Arr.match(unknownPlugins(config), {
    onEmpty: () => Effect.void,
    onNonEmpty: (names) =>
      Effect.fail(
        MdlintError.make({
          message: `rules name plugins that are not configured: ${Arr.join(names, ", ")}`,
        }),
      ),
  });

export const lint = Effect.fn("mdlint.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  yield* checkPlugins(config);
  const resolved = resolve(config);
  const options = yield* nativeOptions(resolved, config);
  const results = yield* runNative(input, options);
  const compat = yield* runCompatRules({
    files: pipe(
      results,
      Arr.flatMap((result) => Option.toArray(sourceOf(result))),
    ),
    rules: resolved.compat,
  });
  yield* Effect.promise(() => native.flushTelemetry());
  const builtin = pipe(results, Arr.flatMap(builtinOf));
  const scripted = pipe(results, Arr.flatMap(scriptedOne(resolved)));
  return pipe([...builtin, ...scripted, ...compat], Arr.sortBy(byPosition));
});
