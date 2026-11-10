import type { Location } from "@oxlint/plugins";
import {
  Array as Arr,
  Boolean as Bool,
  Console,
  Effect,
  Function as Fn,
  Match,
  Option,
  Predicate,
  String as Str,
  Record as Rec,
  pipe,
} from "effect";

import { asText } from "./explain-text.ts";
import type { Explanation } from "./explain-text.ts";
import { refAt } from "./request.ts";
import { envOf, toJson } from "./runtime.ts";
import type {
  Answer,
  Answers,
  DecisionRequest,
  ExplainSetting,
  Match as RuleMatch,
  Question,
  Verdict,
} from "./types.ts";
import { wireRequestsFor } from "./wire.ts";
import type { WireRequest } from "./wire.ts";

type ExplainFormat = Extract<ExplainSetting, string>;

type ExplainMode = "off" | ExplainFormat;

const EXPLAIN_ENV = "OXLINT_DECISION_EXPLAIN";
const OFF_VALUES: ReadonlySet<string> = new Set(["0", "false", "off", "no"]);
const STATE_HEAD_CHARS = 60;
const OPTION_SEPARATOR = "__";
const FIRST = 1;
const START = 0;
const COLUMN_BASE = 1;

interface Outcome {
  readonly served: string;
  readonly answers: Answers;
  readonly cached: boolean | undefined;
  readonly verdict: Option.Option<Verdict>;
  readonly reported: boolean;
}

interface Explainer {
  readonly outcome: (match: RuleMatch, at: Placed, outcome: Outcome) => void;
  readonly failure: (matches: readonly RuleMatch[], reason: string) => void;
}

interface Placed {
  readonly ref: string;
  readonly loc: Location;
}

interface ExplainPass {
  readonly setting: ExplainSetting;
  readonly cwd: string;
  readonly filename: string;
  readonly model: string;
  readonly request: DecisionRequest;
  readonly durationMs: number;
}

const SEPARATOR = /^[/\\]/u;

const relativeTo = (root: string, filename: string): string =>
  Bool.match(
    Str.isNonEmpty(root) &&
      Str.startsWith(root)(filename) &&
      SEPARATOR.test(Str.slice(root.length)(filename)),
    {
      onTrue: () => Str.slice(root.length + FIRST)(filename),
      onFalse: () => filename,
    },
  );

const fromSetting = (setting: ExplainSetting): ExplainMode =>
  Match.value(setting).pipe(
    Match.when("json", (): ExplainMode => "json"),
    Match.when(true, (): ExplainMode => "text"),
    Match.when("text", (): ExplainMode => "text"),
    Match.orElse((): ExplainMode => "off"),
  );

const fromEnv = (value: string): ExplainMode =>
  Match.value(Str.toLowerCase(value)).pipe(
    Match.when("json", (): ExplainMode => "json"),
    Match.when(
      (lower) => OFF_VALUES.has(lower),
      (): ExplainMode => "off",
    ),
    Match.orElse((): ExplainMode => "text"),
  );

const explainModeOf = (setting: ExplainSetting): ExplainMode =>
  Option.match(envOf(EXPLAIN_ENV), { onNone: () => fromSetting(setting), onSome: fromEnv });

const probabilitiesIn = (answer: Answer): Option.Option<Readonly<Record<string, number>>> => {
  if (answer.type === "noul") {
    return Option.some({ yes: answer.noul });
  }
  if (answer.type === "choice") {
    return Option.fromUndefinedOr(answer.probabilities);
  }
  return Option.none();
};

const probabilitiesOf = (answer: Answer | undefined): Readonly<Record<string, number>> =>
  Option.fromUndefinedOr(answer).pipe(
    Option.flatMap(probabilitiesIn),
    Option.getOrElse(() => ({})),
  );

const asksAbout = (ref: string, id: string): boolean =>
  pipe(Str.split(id, OPTION_SEPARATOR), Arr.take(FIRST), Arr.contains(ref));

const sentFor = (
  sent: readonly WireRequest[],
  ref: string,
): readonly (readonly [string, Question])[] =>
  pipe(
    sent,
    Arr.flatMap((wire) =>
      pipe(
        Rec.toEntries(wire.questions),
        Arr.filter(([id]) => asksAbout(ref, id)),
      ),
    ),
  );

const stateTextOf = (sent: readonly WireRequest[], ref: string, snippet: string): string =>
  Arr.findFirst(sent, (wire) =>
    pipe(
      Rec.keys(wire.questions),
      Arr.some((id) => asksAbout(ref, id)),
    ),
  ).pipe(
    Option.map(({ state }) => state),
    Option.filter(Predicate.isString),
    Option.getOrElse(() => snippet),
  );

const summaryOf = (text: string): Explanation["state"] => ({
  chars: text.length,
  head: Str.slice(START, STATE_HEAD_CHARS)(Str.trim(Str.replaceAll(/\s+/gu, " ")(text))),
});

type Base = Pick<
  Explanation,
  "file" | "line" | "column" | "rule" | "model" | "cutoff" | "durationMs" | "state" | "questions"
>;

interface Sent {
  readonly pass: ExplainPass;
  readonly sent: readonly WireRequest[];
}

const baseOf = (
  { pass, sent }: Sent,
  match: RuleMatch,
  { ref, loc }: Placed,
): ((answers: Answers) => Base) => {
  const questions = sentFor(sent, ref);
  return (answers) => ({
    file: relativeTo(pass.cwd, pass.filename),
    line: loc.start.line,
    column: loc.start.column + COLUMN_BASE,
    rule: match.rule.id,
    model: pass.model,
    cutoff: match.rule.cutoff,
    durationMs: pass.durationMs,
    state: summaryOf(stateTextOf(sent, ref, match.snippet)),
    questions: pipe(
      questions,
      Arr.map(([id, question]) => ({
        id,
        question: question.instructions,
        probabilities: probabilitiesOf(answers[id]),
      })),
    ),
  });
};

const printerFor =
  (mode: ExplainFormat) =>
  (explanation: Explanation): void => {
    const line = Bool.match(mode === "json", {
      onTrue: () => toJson(explanation),
      onFalse: () => asText(explanation),
    });
    Effect.runFork(Console.error(line));
  };

const explaining = (pass: ExplainPass, mode: ExplainFormat): Explainer => {
  const sent = wireRequestsFor(pass.request);
  const print = printerFor(mode);
  return {
    outcome: (match, at, { served, answers, cached, verdict, reported }) => {
      print({
        ...baseOf({ pass, sent }, match, at)(answers),
        served,
        ...Option.match(Option.fromUndefinedOr(cached), {
          onNone: () => ({}),
          onSome: (hit) => ({ cached: hit }),
        }),
        ...Option.match(verdict, { onNone: () => ({}), onSome: (found) => ({ verdict: found }) }),
        reported,
      });
    },
    failure: (matches, reason) => {
      for (const [index, match] of matches.entries()) {
        const at = { ref: refAt(index), loc: match.loc };
        print({ ...baseOf({ pass, sent }, match, at)({}), reported: false, error: reason });
      }
    },
  };
};

const SILENT: Explainer = { outcome: Fn.constVoid, failure: Fn.constVoid };

const explainerFor = (pass: ExplainPass): Explainer =>
  Match.value(explainModeOf(pass.setting)).pipe(
    Match.when("off", () => SILENT),
    Match.orElse((mode) => explaining(pass, mode)),
  );

export { explainerFor };
export type { Explainer, ExplainPass, Outcome, Placed };
