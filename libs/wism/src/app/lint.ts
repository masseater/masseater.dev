import { Array as Arr, Boolean as Bool, Effect, Order, pipe } from "effect";

import { resolve, unknownPlugins } from "#/entities/rule/index.ts";
import { runScriptRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, WismConfig } from "#/shared/config/index.ts";
import { WismError, failedWith } from "#/shared/lib/errors.ts";
import { present } from "#/shared/lib/present.ts";
import { native } from "#/shared/native/index.ts";
import type { NativeOptions, NativeReport } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: WismConfig;
}

const SAMPLED = "01";
const NOT_SAMPLED = "00";

const flagsOf = (sampled: boolean): string =>
  Bool.match(sampled, { onFalse: () => NOT_SAMPLED, onTrue: () => SAMPLED });

const traceparent = Effect.currentSpan.pipe(
  Effect.map((span) => `00-${span.traceId}-${span.spanId}-${flagsOf(span.sampled)}`),
  Effect.option,
);

const byPosition = Order.combine(
  Order.mapInput(Order.String, (diagnostic: Diagnostic) => diagnostic.path),
  Order.mapInput(Order.Number, (diagnostic: Diagnostic) => diagnostic.line),
);

const checkPlugins = (config: WismConfig): Effect.Effect<void, WismError> =>
  Arr.match(unknownPlugins(config), {
    onEmpty: () => Effect.void,
    onNonEmpty: (names) =>
      Effect.fail(
        WismError.make({
          message: `rules name plugins that are not configured: ${Arr.join(names, ", ")}`,
        }),
      ),
  });

const runNative = (
  input: LintInput,
  options: NativeOptions,
): Effect.Effect<NativeReport, WismError> =>
  native.pipe(
    Effect.flatMap((addon) =>
      Effect.try({
        try: () => addon.lint(input.root, input.files, options),
        catch: failedWith("wism could not lint"),
      }),
    ),
    Effect.withSpan("wism.native", { attributes: { "wism.files": input.files.length } }),
  );

const flushTelemetry: Effect.Effect<void, WismError> = native.pipe(
  Effect.flatMap((addon) => Effect.promise(() => addon.flushTelemetry())),
);

export const lint = Effect.fn("wism.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  yield* checkPlugins(config);
  const resolved = resolve(config);
  const parent = yield* traceparent;
  const keepGraph = Arr.isReadonlyArrayNonEmpty(resolved.scripts);
  const report = yield* runNative(input, {
    config: { kinds: config.kinds ?? [], rules: resolved.builtin },
    keepGraph,
    ...present(parent, (value) => ({ traceparent: value })),
  });
  yield* flushTelemetry;
  const scripted = runScriptRules(resolved.scripts)({
    files: input.files,
    nodes: report.nodes ?? [],
    edges: report.edges ?? [],
  });
  return pipe([...report.diagnostics, ...scripted], Arr.sortBy(byPosition));
});
