import { present } from "@masseater.dev/lint-host";
import { Array as Arr, Match, Option, pipe } from "effect";

import type { Diagnostic } from "#/shared/config/index.ts";
import type { NativeResult, PluginDiagnostic } from "#/shared/native/index.ts";

const severityOf = (diagnostic: PluginDiagnostic): Diagnostic["severity"] =>
  Match.value(diagnostic.severity).pipe(
    Match.when("error", (): Diagnostic["severity"] => "error"),
    Match.orElse((): Diagnostic["severity"] => "warn"),
  );

const diagnosticOf =
  (path: string) =>
  (diagnostic: PluginDiagnostic): Diagnostic => ({
    path,
    line: diagnostic.line,
    column: diagnostic.column,
    rule: diagnostic.rule,
    message: diagnostic.message,
    severity: severityOf(diagnostic),
    ...present(Option.fromNullishOr(diagnostic.detail), (detail) => ({ detail })),
  });

export const pluginDiagnosticsOf = (result: NativeResult): readonly Diagnostic[] =>
  pipe(result.pluginDiagnostics ?? [], Arr.map(diagnosticOf(result.path)));
