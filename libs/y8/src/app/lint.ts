import { callAddon, present, sortByPosition, traceparent } from "@masseater.dev/lint-host";
import { Array as Arr, Effect, Match, Option, pipe } from "effect";

import { BUILTIN, groupByOverrides, resolve, unknownPlugins } from "#/entities/rule/index.ts";
import type { FileGroup, Resolved } from "#/entities/rule/index.ts";
import { agentDiagnosticsOf } from "#/features/map-agent-diagnostics/index.ts";
import { readProject } from "#/features/read-project/index.ts";
import { runCompatRules } from "#/features/run-compat-rules/index.ts";
import { runScriptRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, Project, Y8Config } from "#/shared/config/index.ts";
import { Y8Error, failedWith } from "#/shared/lib/errors.ts";
import { native, sourceView } from "#/shared/native/index.ts";
import type {
  NativeDiagnostic,
  NativeOptions,
  NativeResult,
  SourceFile,
  SourceView,
} from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly projectFiles?: readonly string[];
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

const nativeOptions = (
  root: string,
  resolved: Resolved,
  config: Y8Config,
): Effect.Effect<NativeOptions> =>
  traceparent.pipe(
    Effect.map((parent): NativeOptions => ({
      config: resolved.core,
      inlineConfig: config.inlineConfig ?? true,
      keepTree: Arr.isReadonlyArrayNonEmpty(resolved.scripts),
      keepSource: needsText(resolved),
      ...present(parent, (value) => ({ traceparent: value })),
      ...present(resolved.agent, ({ disabled }) => ({ agnix: { root, disabled } })),
    })),
  );

const viewOf = (result: NativeResult): Option.Option<SourceView> =>
  pipe(Option.fromNullishOr(result.source), Option.map(sourceView));

const sourceOf = (result: NativeResult): Option.Option<SourceFile> =>
  pipe(
    viewOf(result),
    Option.map((view): SourceFile => ({ path: result.path, text: view.text() })),
  );

const scriptedOne =
  (resolved: Resolved, project: Project) =>
  (result: NativeResult): readonly Diagnostic[] =>
    pipe(
      viewOf(result),
      Option.map((source) =>
        runScriptRules({
          path: result.path,
          source,
          rules: resolved.scripts,
          project,
        }),
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

const lintGroup = (
  root: string,
  project: Project,
): ((group: FileGroup) => Effect.Effect<readonly Diagnostic[], Y8Error>) =>
  Effect.fn("y8.lint.group")(function* group(input: FileGroup) {
    const resolved = resolve(input.config);
    const options = yield* nativeOptions(root, resolved, input.config);
    const results = yield* callAddon({
      addon: native,
      name: "y8",
      files: input.files.length,
      call: (addon) => addon.lintPaths(root, input.files, options),
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
    const scripted = yield* Effect.sync(() =>
      pipe(results, Arr.flatMap(scriptedOne(resolved, project))),
    ).pipe(
      Effect.withSpan("y8.script_rules", {
        attributes: { "y8.files": results.length, "y8.rules": resolved.scripts.length },
      }),
    );
    const agent = Option.match(resolved.agent, {
      onNone: (): readonly Diagnostic[] => [],
      onSome: (rules) => pipe(results, Arr.flatMap(agentDiagnosticsOf(rules))),
    });
    return [...builtin, ...scripted, ...compat, ...agent];
  });

export const lint = Effect.fn("y8.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  yield* checkPlugins(config);
  const project = yield* readProject({
    root: input.root,
    files: input.files,
    projectFiles: input.projectFiles ?? [],
  });
  const found = yield* Effect.forEach(
    groupByOverrides(config, input.files),
    lintGroup(input.root, project),
    { concurrency: 1 },
  );
  return sortByPosition<Diagnostic>(Arr.flatten(found));
});
