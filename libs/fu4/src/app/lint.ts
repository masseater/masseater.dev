import { callAddon, present, sortByPosition, traceparent } from "@r_masseater/lint-host";
import { Array as Arr, Effect, pipe } from "effect";

import type { Diagnostic, Fu4Config } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import { native } from "#/shared/native/index.ts";
import type { NativeOptions, NativeResult } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: Fu4Config;
}

const diagnosticsOf = (result: NativeResult): readonly Diagnostic[] =>
  pipe(
    result.diagnostics,
    Arr.map((diagnostic): Diagnostic => ({
      path: result.path,
      line: diagnostic.line,
      column: diagnostic.column,
      rule: diagnostic.kind,
      message: diagnostic.message,
      severity: "error",
    })),
  );

export const lint = Effect.fn("fu4.lint")(function* lint(input: LintInput) {
  const parent = yield* traceparent;
  const options: NativeOptions = {
    config: input.config ?? {},
    ...present(parent, (value) => ({ traceparent: value })),
  };
  const results = yield* callAddon({
    addon: native,
    name: "fu4",
    files: input.files.length,
    call: (addon) => addon.lintPaths(input.root, input.files, options),
    failWith: failedWith,
  });
  return sortByPosition(pipe(results, Arr.flatMap(diagnosticsOf)));
});
