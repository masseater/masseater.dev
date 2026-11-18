import { Array as Arr, Boolean as Bool, Match, Option, pipe } from "effect";

import { childOf } from "#/entities/expression-tree/index.ts";
import type { ContextExpr, Spanned } from "#/entities/expression-tree/index.ts";
import { conditionBare } from "#/features/audit-workflows/lib/bare.ts";
import { parseBare } from "#/features/audit-workflows/lib/expressions.ts";
import { atPath, confidence, finding, severity } from "#/features/audit-workflows/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { jobConditions } from "#/features/audit-workflows/lib/workflow-steps.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import type { Severity } from "#/features/audit-workflows/model/finding.ts";

const meta = { ident: "unsound-contains", desc: "unsound contains condition" } as const;

const USER_CONTROLLABLE = Arr.map(
  [
    "env",
    "github.actor",
    "github.base_ref",
    "github.head_ref",
    "github.ref",
    "github.ref_name",
    "github.sha",
    "github.triggering_actor",
    "inputs",
  ],
  childOf,
);

type Found = readonly (readonly [ContextExpr, string])[];

const isStringLiteral = (spanned: Spanned): boolean =>
  spanned.expr.type === "literal" && spanned.expr.literal.kind === "string";

type Pair = readonly [Spanned, Spanned];

const pairWith =
  (first: Spanned) =>
  (rest: readonly Spanned[]): Option.Option<Pair> =>
    Arr.match(rest, {
      onEmpty: () => Option.none(),
      onNonEmpty: ([second, ...more]) => {
        const pair: Pair = [first, second];
        return Option.liftPredicate(pair, () => Arr.isReadonlyArrayEmpty(more));
      },
    });

const pairOf = (args: readonly Spanned[]): Option.Option<Pair> =>
  Arr.match(args, {
    onEmpty: () => Option.none(),
    onNonEmpty: ([first, ...rest]) => pairWith(first)(rest),
  });

const contextAt = (second: Spanned): Found => {
  if (second.expr.type !== "context") {
    return [];
  }
  return [[second.expr, second.origin.raw]];
};

const containsCheck = (args: readonly Spanned[]): Found =>
  pipe(
    pairOf(args),
    Option.filter(([first]) => isStringLiteral(first)),
    Option.map(([, second]) => contextAt(second)),
    Option.getOrElse((): Found => []),
  );

const none = (): Found => [];

const walk = (spanned: Spanned): Found =>
  Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: none,
      star: none,
      identifier: none,
      call: (expr) => {
        const found = containsCheck(expr.args);
        if (expr.func === "contains" && Arr.isReadonlyArrayNonEmpty(found)) {
          return found;
        }
        return pipe(expr.args, Arr.flatMap(walk));
      },
      context: (expr) => pipe(expr.parts, Arr.flatMap(walk)),
      index: (expr) => walk(expr.inner),
      not: (expr) => walk(expr.inner),
      binary: (expr) => [...walk(expr.lhs), ...walk(expr.rhs)],
    }),
  );

const severityOf = (context: ContextExpr): Severity =>
  Bool.match(
    pipe(
      USER_CONTROLLABLE,
      Arr.some((test) => test(context)),
    ),
    { onTrue: () => "high", onFalse: () => "informational" },
  );

const unsound = (raw: string): readonly (readonly [Severity, string])[] =>
  pipe(
    parseBare(conditionBare(raw)),
    Option.toArray,
    Arr.flatMap(walk),
    Arr.map(([context, text]) => [severityOf(context), text] as const),
  );

export const unsoundContains: Audit = {
  ...meta,
  normalJob: (job) =>
    Arr.flatMap(jobConditions(job), ([condition, location]) => {
      if (condition.type === "expr") {
        return Arr.map(unsound(condition.raw), ([level, context]) =>
          pipe(
            finding(meta),
            severity(level),
            confidence("high"),
            atPath(
              location,
              withKeys("if"),
              primary,
              annotated(
                `contains(..) condition can be bypassed if attacker can control '${context}'`,
              ),
            ),
          ),
        );
      }
      return [];
    }),
};
