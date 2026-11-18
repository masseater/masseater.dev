import { Array as Arr, Match, pipe } from "effect";

import { childOf } from "#/entities/expression-tree/index.ts";
import type { Expr, Spanned } from "#/entities/expression-tree/index.ts";
import { atRaw, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { parsedFenced, spanLocation, supportsTemplates } from "#/features/zizmor/lib/raw.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";

const meta = { ident: "unredacted-secrets", desc: "leaked secret values" } as const;

const isSecret = childOf("secrets");

const NONE = 0;
const ONE = 1;

type Count = (spanned: Spanned) => number;

const total =
  (count: Count) =>
  (items: readonly Spanned[]): number =>
    Arr.reduce(items, NONE, (sum, item) => sum + count(item));

const leaksSecret = (arg: Spanned): boolean => arg.expr.type === "context" && isSecret(arg.expr);

const callLeakages =
  (count: Count) =>
  (expr: Extract<Expr, { readonly type: "call" }>): number => {
    if (expr.func === "fromjson" && pipe(expr.args, Arr.some(leaksSecret))) {
      return ONE;
    }
    return total(count)(expr.args);
  };

const none = (): number => NONE;

const leakages: Count = (spanned) =>
  Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: none,
      star: none,
      identifier: none,
      call: callLeakages(leakages),
      index: (expr) => leakages(expr.inner),
      not: (expr) => leakages(expr.inner),
      context: (expr) => total(leakages)(expr.parts),
      binary: (expr) => leakages(expr.lhs) + leakages(expr.rhs),
    }),
  );

export const unredactedSecrets: Audit = {
  ...meta,
  raw: (input) => {
    if (!supportsTemplates(input)) {
      return [];
    }
    return Arr.flatMap(parsedFenced(input), (span) =>
      Array.from({ length: leakages(span.parsed) }, () =>
        pipe(
          finding(meta),
          confidence("high"),
          severity("medium"),
          atRaw(spanLocation(input)("bypasses secret redaction")(span)),
        ),
      ),
    );
  },
};
