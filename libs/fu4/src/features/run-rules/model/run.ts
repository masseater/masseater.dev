import { Array as Arr, Effect, pipe } from "effect";

import type { ActiveRule } from "#/entities/rule/index.ts";
import type {
  Diagnostic,
  InputKind,
  Project,
  Report,
  RuleContext,
  ScriptLanguage,
  Source,
} from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

export interface FileInput {
  readonly path: string;
  readonly kind: InputKind;
  readonly source: Source;
  readonly rules: readonly ActiveRule[];
  readonly settings: Readonly<Record<string, unknown>>;
  readonly project: Project;
  readonly parseScript: (language: ScriptLanguage, text: string) => Source;
}

const CONCURRENT = { concurrency: "unbounded" } as const;

const appliesTo =
  (kind: InputKind) =>
  ({ rule }: ActiveRule): boolean =>
    pipe(
      rule.meta.kinds ?? ["workflow"],
      Arr.some((each) => each === kind),
    );

const diagnosticOf =
  (input: FileInput, active: ActiveRule) =>
  ({ rule, ...report }: Report): Diagnostic => ({
    path: input.path,
    ...report,
    rule: rule ?? active.id,
    severity: active.severity,
  });

const checked = (active: ActiveRule, context: RuleContext): Effect.Effect<void> =>
  Effect.suspend(() => {
    const result = active.rule.check(context);
    if (Effect.isEffect(result)) {
      return result;
    }
    return Effect.void;
  });

const runRule =
  (input: FileInput) =>
  (active: ActiveRule): Effect.Effect<readonly Diagnostic[], Fu4Error> => {
    const reports: Report[] = [];
    const context: RuleContext = {
      filename: input.path,
      kind: input.kind,
      source: input.source,
      options: active.options,
      settings: input.settings,
      project: input.project,
      parseScript: input.parseScript,
      report: (report) => {
        reports.push(report);
      },
    };
    return checked(active, context).pipe(
      Effect.catchCause((cause) =>
        cause.pipe(failedWith(`fu4 rule ${active.id} failed on ${input.path}`), Effect.fail),
      ),
      Effect.map(() => pipe(reports, Arr.map(diagnosticOf(input, active)))),
      Effect.withSpan("fu4.rule", {
        attributes: { "fu4.rule.id": active.id, "code.file.path": input.path },
      }),
    );
  };

export const runFile = Effect.fn("fu4.runFile")(function* runFile(input: FileInput) {
  const active = pipe(input.rules, Arr.filter(appliesTo(input.kind)));
  const results = yield* Effect.forEach(active, runRule(input), CONCURRENT);
  return Arr.flatten(results);
});
