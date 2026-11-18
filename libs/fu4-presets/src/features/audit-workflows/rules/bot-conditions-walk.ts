import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import { matchesPattern } from "#/entities/expression-tree/index.ts";
import type { ContextExpr, Expr, Literal, Spanned } from "#/entities/expression-tree/index.ts";
import { conditionBare } from "#/features/audit-workflows/lib/bare.ts";
import { parseBare } from "#/features/audit-workflows/lib/expressions.ts";

type LiteralExpr = Extract<Expr, { readonly type: "literal" }>;
type BinaryExpr = Extract<Expr, { readonly type: "binary" }>;

interface Walk {
  readonly found: Option.Option<Spanned>;
  readonly dominating: boolean;
}

type Walker = (dominating: boolean) => (spanned: Spanned) => Walk;
type Both = (dominating: boolean) => (lhs: Spanned, rhs: Spanned) => Walk;

const NAME_CONTEXTS = Arr.map(["github.actor", "github.triggering_actor"], matchesPattern);
const ID_CONTEXTS = Arr.map(["github.actor_id"], matchesPattern);
const BOT_IDS = new Set(["29110", "49699333", "27856297", "29139614"]);
const BOT_SUFFIX = "[bot]";

const literalText = (literal: Literal): string => {
  if (literal.kind === "string") {
    return literal.value;
  }
  if (literal.kind === "null") {
    return "null";
  }
  return String(literal.value);
};

const anyMatches =
  (tests: readonly ((context: ContextExpr) => boolean)[]) =>
  (context: ContextExpr): boolean =>
    pipe(
      tests,
      Arr.some((test) => test(context)),
    );

const isSpoofable = (context: ContextExpr, literal: Literal): boolean => {
  const text = literalText(literal);
  return (
    (anyMatches(NAME_CONTEXTS)(context) && pipe(text, Str.endsWith(BOT_SUFFIX))) ||
    (anyMatches(ID_CONTEXTS)(context) && BOT_IDS.has(text))
  );
};

const contextOf = (spanned: Spanned): Option.Option<ContextExpr> =>
  Option.liftPredicate(spanned.expr, (expr): expr is ContextExpr => expr.type === "context");

const literalOf = (spanned: Spanned): Option.Option<Literal> =>
  pipe(
    Option.liftPredicate(spanned.expr, (expr): expr is LiteralExpr => expr.type === "literal"),
    Option.map((expr) => expr.literal),
  );

const spoofPair = (context: Spanned, literal: Spanned): Option.Option<boolean> =>
  pipe(contextOf(context), Option.zipWith(literalOf(literal), isSpoofable));

const nothing = (dominating: boolean): Walk => ({ found: Option.none(), dominating });

const either =
  (dominating: boolean) =>
  (left: Walk, right: Walk): Walk => ({
    found: Option.orElse(left.found, () => right.found),
    dominating,
  });

const firstOf =
  (walk: Walker) =>
  (dominating: boolean) =>
  (children: readonly Spanned[]): Walk => {
    if (Arr.isReadonlyArrayEmpty(children)) {
      return nothing(dominating);
    }
    const inner = walk(false);
    return { found: Arr.findFirst(children, (child) => inner(child).found), dominating: false };
  };

const equality =
  (both: Both) =>
  (spanned: Spanned) =>
  ({ lhs, rhs }: BinaryExpr): Walk => {
    if (Option.isNone(contextOf(lhs)) && Option.isNone(contextOf(rhs))) {
      return nothing(true);
    }
    const pair = pipe(
      spoofPair(lhs, rhs),
      Option.orElse(() => spoofPair(rhs, lhs)),
    );
    return Option.match(pair, {
      onNone: () => both(true)(lhs, rhs),
      onSome: (spoofable) => ({
        found: Option.liftPredicate(spanned, () => spoofable),
        dominating: true,
      }),
    });
  };

const binary =
  (both: Both) =>
  (spanned: Spanned) =>
  (expr: BinaryExpr): Walk => {
    if (expr.op === "or") {
      return both(true)(expr.lhs, expr.rhs);
    }
    if (expr.op !== "eq") {
      return both(false)(expr.lhs, expr.rhs);
    }
    return equality(both)(spanned)(expr);
  };

const walk: Walker = (dominating) => (spanned) => {
  const both: Both = (inner) => (lhs, rhs) => either(inner)(walk(inner)(lhs), walk(inner)(rhs));
  const children = firstOf(walk)(dominating);
  return Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: () => nothing(dominating),
      star: () => nothing(dominating),
      identifier: () => nothing(dominating),
      call: (expr) => children(expr.args),
      context: (expr) => children(expr.parts),
      index: (expr) => walk(dominating)(expr.inner),
      not: (expr) => walk(false)(expr.inner),
      binary: binary(both)(spanned),
    }),
  );
};

export interface Spoof {
  readonly raw: string;
  readonly dominating: boolean;
}

const spoofsOf = ({ found, dominating }: Walk): readonly Spoof[] =>
  Arr.map(Option.toArray(found), (expr) => ({ raw: expr.origin.raw, dominating }));

export const spoofsIn = (raw: string): readonly Spoof[] =>
  pipe(parseBare(conditionBare(raw)), Option.toArray, Arr.map(walk(true)), Arr.flatMap(spoofsOf));
