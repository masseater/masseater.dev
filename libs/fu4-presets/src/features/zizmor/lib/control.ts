import { Array as Arr, Boolean as Bool, Match, Option, String as Str, pipe } from "effect";

import type { EnvValue, RepositoryUses } from "#/features/zizmor/model/common.ts";
import type {
  ControlEvaluation,
  ControlExpr,
  ControlOrigin,
  FieldType,
  Verdict,
} from "#/features/zizmor/model/coordinate.ts";
import type { Comment } from "#/features/zizmor/model/finding.ts";

import { displayEnv } from "./common.ts";
import { extracted } from "./expressions.ts";
import { isBefore, parseVersion, versionOfComment } from "./version.ts";
import type { Version } from "./version.ts";

export interface ControlSubject {
  readonly uses: RepositoryUses;
  readonly comments: readonly Comment[];
  readonly inputs: ReadonlyMap<string, EnvValue>;
}

type FieldExpr = Extract<ControlExpr, { readonly type: "field" }>;
type Combine = (left: ControlEvaluation, right: ControlEvaluation) => ControlEvaluation;

const USES_REF: readonly ControlOrigin[] = [{ type: "uses-ref" }];
const COMMIT_SHA = /^[0-9a-fA-F]{40}$/u;

const sameOrigin = (left: ControlOrigin, right: ControlOrigin): boolean => {
  if (
    left.type === right.type &&
    (left.type === "default" || left.type === "input") &&
    (right.type === "default" || right.type === "input")
  ) {
    return left.field === right.field;
  }
  return left.type === right.type;
};

const isNew =
  (left: readonly ControlOrigin[]) =>
  (origin: ControlOrigin): boolean =>
    !pipe(
      left,
      Arr.some((each) => sameOrigin(each, origin)),
    );

const merged =
  (verdict: Verdict): Combine =>
  (left, right) => ({
    verdict,
    origins: [...left.origins, ...pipe(right.origins, Arr.filter(isNew(left.origins)))],
  });

const prefer =
  (verdict: Verdict) =>
  (left: ControlEvaluation, right: ControlEvaluation): Option.Option<ControlEvaluation> => {
    const onLeft = left.verdict === verdict;
    const onRight = right.verdict === verdict;
    if (onLeft && onRight) {
      return Option.some(merged(verdict)(left, right));
    }
    if (onLeft) {
      return Option.some(left);
    }
    return Option.liftPredicate(right, () => onRight);
  };

const combine =
  (dominant: Verdict, fallback: Verdict): Combine =>
  (left, right) =>
    pipe(
      prefer(dominant)(left, right),
      Option.orElse(() => prefer("conditional")(left, right)),
      Option.getOrElse(() => merged(fallback)(left, right)),
    );

const and = combine("not-satisfied", "satisfied");
const or = combine("satisfied", "not-satisfied");

const negate = (evaluation: ControlEvaluation): ControlEvaluation => {
  if (evaluation.verdict === "satisfied") {
    return { ...evaluation, verdict: "not-satisfied" };
  }
  if (evaluation.verdict === "not-satisfied") {
    return { ...evaluation, verdict: "satisfied" };
  }
  return evaluation;
};

const verdictOf = (satisfied: boolean): Verdict =>
  Bool.match(satisfied, { onTrue: () => "satisfied", onFalse: () => "not-satisfied" });

const versionOf = ({ uses, comments }: ControlSubject): Option.Option<Version> => {
  if (!COMMIT_SHA.test(uses.gitRef)) {
    return parseVersion(uses.gitRef);
  }
  return Arr.findFirst(comments, versionOfComment);
};

const unlessFenced =
  (value: string) =>
  (result: boolean): Option.Option<boolean> =>
    Option.liftPredicate(result, () => !extracted(value).fenced);

const booleanValue = (value: string): Option.Option<boolean> => {
  if (value === "true" || value === "false") {
    return Option.some(value === "true");
  }
  return unlessFenced(value)(true);
};

const controlValue = (
  fieldType: FieldType,
  value: string,
  empty: boolean,
): Option.Option<boolean> =>
  Match.value(fieldType).pipe(
    Match.discriminatorsExhaustive("type")({
      boolean: () => booleanValue(value),
      "free-string": () => Option.some(!empty),
      exact: ({ items }) => unlessFenced(value)(items.includes(value)),
    }),
  );

const inputEvaluation =
  (expr: FieldExpr) =>
  (value: EnvValue): ControlEvaluation => {
    const origins: readonly ControlOrigin[] = [{ type: "input", field: expr.field }];
    const empty = value.type === "string" && Str.isEmpty(value.value);
    const control = controlValue(expr.fieldType, displayEnv(value), empty);
    return Option.match(control, {
      onNone: () => ({ verdict: "conditional", origins }),
      onSome: (on) => ({ verdict: verdictOf(on === (expr.toggle === "opt-in")), origins }),
    });
  };

const fieldEvaluation =
  (inputs: ReadonlyMap<string, EnvValue>) =>
  (expr: FieldExpr): ControlEvaluation =>
    Option.match(Option.fromNullishOr(inputs.get(expr.field)), {
      onNone: () => ({
        verdict: verdictOf(expr.satisfiedByDefault),
        origins: [{ type: "default", field: expr.field }],
      }),
      onSome: inputEvaluation(expr),
    });

const versionEvaluation =
  (subject: ControlSubject) =>
  (limit: Version): ControlEvaluation =>
    Option.match(versionOf(subject), {
      onNone: () => ({ verdict: "conditional", origins: USES_REF }),
      onSome: (version) => ({ verdict: verdictOf(isBefore(limit)(version)), origins: USES_REF }),
    });

const SATISFIED: ControlEvaluation = { verdict: "satisfied", origins: [] };
const NOT_SATISFIED: ControlEvaluation = { verdict: "not-satisfied", origins: [] };

export const evaluateControl =
  (subject: ControlSubject) =>
  (expr: ControlExpr): ControlEvaluation => {
    const evaluate = evaluateControl(subject);
    return Match.value(expr).pipe(
      Match.discriminatorsExhaustive("type")({
        "version-less-than": ({ version }) => versionEvaluation(subject)(version),
        field: fieldEvaluation(subject.inputs),
        all: ({ exprs }) => Arr.reduce(exprs, SATISFIED, (acc, each) => and(acc, evaluate(each))),
        any: ({ exprs }) =>
          Arr.reduce(exprs, NOT_SATISFIED, (acc, each) => or(acc, evaluate(each))),
        not: (each) => negate(evaluate(each.expr)),
      }),
    );
  };
