import { callAddon, present, sortByPosition, traceparent } from "@r_masseater/lint-host";
import { Array as Arr, Effect, Match, Option, pipe } from "effect";

import { BUILTIN, resolve, unknownPlugins } from "#/entities/rule/index.ts";
import type { Resolved } from "#/entities/rule/index.ts";
import { runCompatRules } from "#/features/run-compat-rules/index.ts";
import { runScriptRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, Y8Config } from "#/shared/config/index.ts";
import { Y8Error, failedWith } from "#/shared/lib/errors.ts";
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
  readonly config?: Y8Config;
}

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

const needsText = (resolved: Resolved): boolean =>
  Arr.isReadonlyArrayNonEmpty(resolved.scripts) || Arr.isReadonlyArrayNonEmpty(resolved.compat);

const nativeOptions = (resolved: Resolved, config: Y8Config): Effect.Effect<NativeOptions> =>
  traceparent.pipe(
    Effect.map((parent): NativeOptions => ({
      config: resolved.core,
      inlineConfig: config.inlineConfig ?? true,
      keepTree: Arr.isReadonlyArrayNonEmpty(resolved.scripts),
      keepText: needsText(resolved),
      ...present(parent, (value) => ({ traceparent: value })),
    })),
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

const checkPlugins = (config: Y8Config): Effect.Effect<void, Y8Error> =>
  Arr.match(unknownPlugins(config), {
    onEmpty: () => Effect.void,
    onNonEmpty: (names) =>
      Effect.fail(
        Y8Error.make({
          message: `rules name plugins that are not configured: ${Arr.join(names, ", ")}`,
        }),
      ),
  });

export const lint = Effect.fn("y8.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  yield* checkPlugins(config);
  const resolved = resolve(config);
  const options = yield* nativeOptions(resolved, config);
  const results = yield* callAddon({
    addon: native,
    name: "y8",
    files: input.files.length,
    call: (addon) => addon.lintPaths(input.root, input.files, options),
    failWith: failedWith,
  });
  const compat = yield* runCompatRules({
    files: pipe(
      results,
      Arr.flatMap((result) => Option.toArray(sourceOf(result))),
    ),
    rules: resolved.compat,
  });
  const builtin = pipe(results, Arr.flatMap(builtinOf));
  const scripted = pipe(results, Arr.flatMap(scriptedOne(resolved)));
  return sortByPosition<Diagnostic>([...builtin, ...scripted, ...compat]);
});
