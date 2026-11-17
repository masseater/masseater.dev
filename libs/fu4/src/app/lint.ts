import { Array as Arr, Boolean as Bool, Effect, Option, Order, pipe } from "effect";

import type { Diagnostic, Fu4Config } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";
import { native } from "#/shared/native/index.ts";
import type { NativeOptions, NativeResult } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: Fu4Config;
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
  Order.combine(
    Order.mapInput(Order.String, (diagnostic: Diagnostic) => diagnostic.path),
    Order.mapInput(Order.Number, (diagnostic: Diagnostic) => diagnostic.line),
  ),
  Order.mapInput(Order.Number, (diagnostic: Diagnostic) => diagnostic.column),
);

const diagnosticsOf = (result: NativeResult): readonly Diagnostic[] =>
  pipe(
    result.diagnostics,
    Arr.map((diagnostic): Diagnostic => ({
      path: result.path,
      line: diagnostic.line,
      column: diagnostic.column,
      rule: diagnostic.kind,
      message: diagnostic.message,
    })),
  );

const runNative = (
  input: LintInput,
  options: NativeOptions,
): Effect.Effect<readonly NativeResult[], Fu4Error> =>
  native.pipe(
    Effect.flatMap((addon) =>
      Effect.try({
        try: () => addon.lintPaths(input.root, input.files, options),
        catch: failedWith("fu4 could not lint"),
      }),
    ),
    Effect.withSpan("fu4.native", { attributes: { "fu4.files": input.files.length } }),
  );

const flushTelemetry: Effect.Effect<void, Fu4Error> = native.pipe(
  Effect.flatMap((addon) => Effect.promise(() => addon.flushTelemetry())),
);

export const lint = Effect.fn("fu4.lint")(function* lint(input: LintInput) {
  const parent = yield* traceparent;
  const options: NativeOptions = {
    config: input.config ?? {},
    ...Option.match(parent, {
      onNone: () => ({}),
      onSome: (value) => ({ traceparent: value }),
    }),
  };
  const results = yield* runNative(input, options);
  yield* flushTelemetry;
  return pipe(results, Arr.flatMap(diagnosticsOf), Arr.sortBy(byPosition));
});
