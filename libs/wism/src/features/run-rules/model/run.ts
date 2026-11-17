import { Array as Arr, Match, Option, pipe } from "effect";

import type { ScriptRule } from "#/entities/rule/index.ts";
import type { Diagnostic, GraphEdge, Report } from "#/shared/config/index.ts";

const FIRST = 1;

export interface Graph {
  readonly files: readonly string[];
  readonly root: string;
  readonly edges: readonly GraphEdge[];
}

const severityOf = (rule: ScriptRule): Diagnostic["severity"] =>
  Match.value(rule.setting.severity).pipe(
    Match.when("warn", () => "warn" as const),
    Match.orElse(() => "error" as const),
  );

const diagnosticOf =
  (rule: ScriptRule) =>
  (report: Report): Diagnostic => ({
    path: report.path,
    line: Option.getOrElse(Option.fromNullishOr(report.line), () => FIRST),
    column: Option.getOrElse(Option.fromNullishOr(report.column), () => FIRST),
    rule: rule.id,
    message: report.message,
    severity: severityOf(rule),
  });

const runOne =
  (graph: Graph) =>
  (rule: ScriptRule): readonly Diagnostic[] => {
    const reports: Report[] = [];
    rule.rule.check({
      ...graph,
      options: rule.setting.options,
      report: (report) => {
        reports.push(report);
      },
    });
    return pipe(reports, Arr.map(diagnosticOf(rule)));
  };

export const runScriptRules =
  (rules: readonly ScriptRule[]) =>
  (graph: Graph): readonly Diagnostic[] =>
    pipe(rules, Arr.flatMap(runOne(graph)));
