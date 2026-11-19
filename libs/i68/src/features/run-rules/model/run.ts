import { present, reportedSeverity } from "@masseater.dev/lint-host";
import type { Song, SourceComment } from "@r_masseater/fumx-parser";
import { soundingsOf } from "@r_masseater/fumx-parser/analysis";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Effect, Option, pipe } from "effect";

import type { ResolvedRule } from "#/entities/rule/index.ts";
import type { Diagnostic, Report } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { I68Error } from "#/shared/lib/errors.ts";

import { suppressionsOf } from "./suppressions.ts";

export interface RunInput {
  readonly path: string;
  readonly comments: readonly SourceComment[];
  readonly song: Song;
  readonly rules: readonly ResolvedRule[];
}

const diagnosticOf =
  (path: string, rule: ResolvedRule) =>
  (report: Report): Diagnostic => ({
    path,
    line: report.line,
    rule: rule.id,
    message: report.message,
    severity: reportedSeverity(rule.setting),
    ...present(Option.fromNullishOr(report.column), (column) => ({ column })),
    ...present(Option.fromNullishOr(report.detail), (detail) => ({ detail })),
  });

const runOne = (
  input: RunInput,
  soundings: readonly Sounding[],
): ((rule: ResolvedRule) => Effect.Effect<readonly Diagnostic[], I68Error>) =>
  Effect.fn("i68.rule")(function* run(rule: ResolvedRule) {
    yield* Effect.annotateCurrentSpan({ "i68.rule": rule.id });
    const reports: Report[] = [];
    yield* Effect.try({
      try: () => {
        rule.rule.check({
          filename: input.path,
          song: input.song,
          soundings,
          options: rule.setting.options,
          report: (report) => {
            reports.push(report);
          },
        });
      },
      catch: failedWith(`${rule.id} failed`),
    });
    return pipe(reports, Arr.map(diagnosticOf(input.path, rule)));
  });

export const runRules = Effect.fn("i68.rules")(function* runRules(input: RunInput) {
  const soundings = soundingsOf(input.song);
  const suppressed = suppressionsOf(input.comments);
  const found = yield* pipe(
    input.rules,
    Effect.forEach(runOne(input, soundings), { concurrency: 1 }),
  );
  return pipe(
    Arr.flatten(found),
    Arr.filter((diagnostic) => !suppressed(diagnostic)),
  );
});
