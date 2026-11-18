import { Array as Arr, Boolean as Bool, Match, String as Str, pipe } from "effect";

import { matchesPattern } from "#/entities/expression-tree/index.ts";
import type { Expr, Spanned } from "#/entities/expression-tree/index.ts";
import { atRaw, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { parsedFenced, spanLocation, supportsTemplates } from "#/features/zizmor/lib/raw.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";

const meta = { ident: "overprovisioned-secrets", desc: "excessively provisioned secrets" } as const;

const isSecrets = matchesPattern("secrets");

const NONE = 0;
const ONE = 1;

const isSecretsHead = (head: Spanned): boolean =>
  head.expr.type === "identifier" && Str.toLowerCase(head.expr.name) === "secrets";

const isDynamicIndex = (index: Spanned): boolean =>
  index.expr.type === "index" && index.expr.inner.expr.type !== "literal";

const isDynamicSecretIndex = (parts: readonly Spanned[]): boolean =>
  Arr.match(parts, {
    onEmpty: () => false,
    onNonEmpty: ([head, ...rest]) =>
      isSecretsHead(head) &&
      Arr.match(rest, {
        onEmpty: () => false,
        onNonEmpty: ([index, ...more]) => isDynamicIndex(index) && Arr.isReadonlyArrayEmpty(more),
      }),
  });

const dumpsSecrets = (arg: Spanned): boolean => arg.expr.type === "context" && isSecrets(arg.expr);

type Count = (spanned: Spanned) => number;

const total =
  (count: Count) =>
  (items: readonly Spanned[]): number =>
    Arr.reduce(items, NONE, (sum, item) => sum + count(item));

const callExpansions =
  (count: Count) =>
  (expr: Extract<Expr, { readonly type: "call" }>): number => {
    if (expr.func === "tojson" && pipe(expr.args, Arr.some(dumpsSecrets))) {
      return ONE;
    }
    return total(count)(expr.args);
  };

const expansions: Count = (spanned) =>
  Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: () => NONE,
      star: () => NONE,
      identifier: () => NONE,
      call: callExpansions(expansions),
      index: (expr) => expansions(expr.inner),
      not: (expr) => expansions(expr.inner),
      context: (expr) =>
        Bool.match(isDynamicSecretIndex(expr.parts), {
          onTrue: () => ONE,
          onFalse: () => total(expansions)(expr.parts),
        }),
      binary: (expr) => expansions(expr.lhs) + expansions(expr.rhs),
    }),
  );

export const overprovisionedSecrets: Audit = {
  ...meta,
  raw: (input) => {
    if (!supportsTemplates(input)) {
      return [];
    }
    return Arr.flatMap(parsedFenced(input), (span) =>
      Array.from({ length: expansions(span.parsed) }, () =>
        pipe(
          finding(meta),
          confidence("high"),
          severity("medium"),
          atRaw(spanLocation(input)("injects the entire secrets context into the runner")(span)),
        ),
      ),
    );
  },
};
