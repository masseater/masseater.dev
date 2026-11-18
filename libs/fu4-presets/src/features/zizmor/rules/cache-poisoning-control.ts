import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import {
  commutativeMatches,
  matchesPattern,
  parseExpression,
} from "#/entities/expression-tree/index.ts";
import type { Expr, Spanned } from "#/entities/expression-tree/index.ts";
import { displayEnv } from "#/features/zizmor/lib/common.ts";
import { usageOf } from "#/features/zizmor/lib/coordinate.ts";
import { extracted, parseBare } from "#/features/zizmor/lib/expressions.ts";
import type { Coordinate, Toggle, Usage } from "#/features/zizmor/model/coordinate.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

import { CACHE_AWARE } from "./cache-poisoning-coordinates.ts";

export type ReleaseTrigger = "tag-push" | "release-branch-push" | "release-event";

export type Scenario =
  | { readonly type: "triggers"; readonly triggers: readonly ReleaseTrigger[] }
  | { readonly type: "action"; readonly publisher: StepView };

type Control =
  | { readonly type: "bool"; readonly value: boolean }
  | { readonly type: "tag" }
  | { readonly type: "not"; readonly inner: Control };

const TAG_PUSH_GUARD: Expr = Result.getOrThrow(
  parseExpression("github.event_name == 'push' && github.ref_type == 'tag'"),
).expr;

const TAG = { type: "tag" } as const;
const TAG_PREFIX = "refs/tags/";
const STARTSWITH_ARGS = 2;

const isRef = matchesPattern("github.ref");

const isRefContext = (spanned: Spanned): boolean =>
  spanned.expr.type === "context" && isRef(spanned.expr);

const isTagLiteral = (spanned: Spanned): boolean =>
  spanned.expr.type === "literal" &&
  spanned.expr.literal.kind === "string" &&
  Str.toLowerCase(spanned.expr.literal.value) === TAG_PREFIX;

const isTagCheck = (args: readonly Spanned[]): boolean => {
  const [lhs, rhs] = args;
  return (
    args.length === STARTSWITH_ARGS &&
    pipe(Option.fromNullishOr(lhs), Option.exists(isRefContext)) &&
    pipe(Option.fromNullishOr(rhs), Option.exists(isTagLiteral))
  );
};

const controlOf = (spanned: Spanned): Option.Option<Control> => {
  const { expr } = spanned;
  if (expr.type === "literal" && expr.literal.kind === "boolean") {
    return Option.some({ type: "bool", value: expr.literal.value });
  }
  if (expr.type === "not") {
    return pipe(
      controlOf(expr.inner),
      Option.map((inner) => ({ type: "not", inner })),
    );
  }
  if (expr.type === "call" && expr.func === "startswith") {
    return Option.liftPredicate<Control>(TAG, () => isTagCheck(expr.args));
  }
  if (expr.type === "binary" && expr.op === "and") {
    return Option.liftPredicate<Control>(TAG, () => commutativeMatches(expr)(TAG_PUSH_GUARD));
  }
  return Option.none();
};

const evalForTagPush = (control: Control): boolean => {
  if (control.type === "bool") {
    return control.value;
  }
  if (control.type === "not") {
    return !evalForTagPush(control.inner);
  }
  return true;
};

const controlField = (
  coordinate: Coordinate,
  step: StepView,
): Option.Option<readonly [Toggle, string]> => {
  const { body } = step;
  if (
    coordinate.type !== "configurable" ||
    coordinate.control.type !== "field" ||
    coordinate.control.fieldType.type !== "boolean" ||
    body.type !== "uses" ||
    body.with.type !== "literal"
  ) {
    return Option.none();
  }
  const { toggle } = coordinate.control;
  return pipe(
    Option.fromNullishOr(body.with.value.get(coordinate.control.field)),
    Option.map((value) => [toggle, displayEnv(value)] as const),
  );
};

const parsedControl = ([toggle, raw]: readonly [Toggle, string]): Option.Option<
  readonly [Toggle, Control]
> => {
  if (!extracted(raw).fenced) {
    return Option.none();
  }
  return pipe(
    parseBare(raw),
    Option.flatMap(controlOf),
    Option.map((control) => [toggle, control] as const),
  );
};

const releaseBranchFree = (scenario: Scenario): boolean =>
  scenario.type === "triggers" &&
  pipe(
    scenario.triggers,
    Arr.every((trigger) => trigger !== "release-branch-push"),
  );

const enabledUsage = (usage: Usage): Usage => {
  if (usage.type === "conditional") {
    return { type: "enabled", origins: usage.origins };
  }
  return usage;
};

const applyControl =
  (usage: Usage) =>
  ([toggle, control]: readonly [Toggle, Control]): Option.Option<Usage> =>
    Option.liftPredicate(
      enabledUsage(usage),
      () => evalForTagPush(control) === (toggle === "opt-in"),
    );

const heuristics =
  (coordinate: Coordinate) =>
  (step: StepView) =>
  (scenario: Scenario) =>
  (usage: Usage): Option.Option<Usage> => {
    if (!releaseBranchFree(scenario)) {
      return Option.some(usage);
    }
    return Option.match(Option.flatMap(controlField(coordinate, step), parsedControl), {
      onNone: () => Option.some(usage),
      onSome: applyControl(usage),
    });
  };

const usageWith =
  (step: StepView) =>
  (coordinate: Coordinate): Option.Option<readonly [Coordinate, Usage]> =>
    pipe(
      usageOf(coordinate)(step),
      Option.map((usage) => [coordinate, usage] as const),
    );

export const cacheUsage =
  (step: StepView) =>
  (scenario: Scenario): Option.Option<Usage> =>
    pipe(
      CACHE_AWARE,
      Arr.findFirst(usageWith(step)),
      Option.flatMap(([coordinate, usage]) => {
        if (usage.type === "conditional") {
          return heuristics(coordinate)(step)(scenario)(usage);
        }
        return Option.some(usage);
      }),
    );
