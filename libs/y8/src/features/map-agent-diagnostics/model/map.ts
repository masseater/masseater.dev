import { Array as Arr, Match, Option, Record as Rec, pipe } from "effect";

import { reportedSeverity } from "#/entities/rule/index.ts";
import type { AgentRules } from "#/entities/rule/index.ts";
import type { Diagnostic } from "#/shared/config/index.ts";
import { present } from "#/shared/lib/present.ts";
import type { AgentDiagnostic, NativeResult } from "#/shared/native/index.ts";

const SEPARATOR = "/";

const levelSeverity = (diagnostic: AgentDiagnostic): Diagnostic["severity"] =>
  Match.value(diagnostic.level).pipe(
    Match.when("error", (): Diagnostic["severity"] => "error"),
    Match.orElse((): Diagnostic["severity"] => "warn"),
  );

const diagnosticOf =
  (rules: AgentRules, path: string) =>
  (diagnostic: AgentDiagnostic): Diagnostic => ({
    path,
    line: diagnostic.line,
    column: diagnostic.column,
    rule: `${rules.plugin}${SEPARATOR}${diagnostic.rule}`,
    message: diagnostic.message,
    severity: pipe(
      Rec.get(rules.settings, diagnostic.rule),
      Option.match({ onNone: () => levelSeverity(diagnostic), onSome: reportedSeverity }),
    ),
    ...present(Option.fromNullishOr(diagnostic.suggestion), (detail) => ({ detail })),
  });

export const agentDiagnosticsOf =
  (rules: AgentRules) =>
  (result: NativeResult): readonly Diagnostic[] =>
    pipe(result.agentDiagnostics ?? [], Arr.map(diagnosticOf(rules, result.path)));
