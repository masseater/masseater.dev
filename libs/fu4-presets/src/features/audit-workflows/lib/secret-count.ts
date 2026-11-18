import { Array as Arr, Boolean as Bool, Match, pipe } from "effect";

import type { ContextExpr, Spanned } from "#/entities/expression-tree/index.ts";
import { atRaw, confidence, finding, severity } from "#/features/audit-workflows/lib/finding.ts";
import {
  parsedFenced,
  spanLocation,
  supportsTemplates,
} from "#/features/audit-workflows/lib/raw.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";

export type Count = (spanned: Spanned) => number;

export interface SecretCounter {
  readonly ident: string;
  readonly desc: string;
  readonly message: string;
  readonly func: string;
  readonly hits: (arg: Spanned) => boolean;
  readonly context: (count: Count) => (expr: ContextExpr) => number;
}

const NONE = 0;
const ONE = 1;

const none = (): number => NONE;

export const total =
  (count: Count) =>
  (items: readonly Spanned[]): number =>
    Arr.reduce(items, NONE, (sum, item) => sum + count(item));

const counted = ({ func, hits, context }: SecretCounter): Count => {
  const count: Count = (spanned) =>
    Match.value(spanned.expr).pipe(
      Match.discriminatorsExhaustive("type")({
        literal: none,
        star: none,
        identifier: none,
        call: (expr) =>
          Bool.match(expr.func === func && pipe(expr.args, Arr.some(hits)), {
            onTrue: () => ONE,
            onFalse: () => total(count)(expr.args),
          }),
        index: (expr) => count(expr.inner),
        not: (expr) => count(expr.inner),
        context: context(count),
        binary: (expr) => count(expr.lhs) + count(expr.rhs),
      }),
    );
  return count;
};

export const secretAudit = (counter: SecretCounter): Audit => {
  const meta = { ident: counter.ident, desc: counter.desc } as const;
  const count = counted(counter);
  return {
    ...meta,
    raw: (input) => {
      if (!supportsTemplates(input)) {
        return [];
      }
      return Arr.flatMap(parsedFenced(input), (span) =>
        Array.from({ length: count(span.parsed) }, () =>
          pipe(
            finding(meta),
            confidence("high"),
            severity("medium"),
            atRaw(spanLocation(input)(counter.message)(span)),
          ),
        ),
      );
    },
  };
};
