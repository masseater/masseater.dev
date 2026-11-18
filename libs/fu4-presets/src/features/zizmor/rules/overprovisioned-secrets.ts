import { Array as Arr, Boolean as Bool, String as Str } from "effect";

import { matchesPattern } from "#/entities/expression-tree/index.ts";
import type { Spanned } from "#/entities/expression-tree/index.ts";
import { secretAudit, total } from "#/features/zizmor/lib/secret-count.ts";

const isSecrets = matchesPattern("secrets");

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

export const overprovisionedSecrets = secretAudit({
  ident: "overprovisioned-secrets",
  desc: "excessively provisioned secrets",
  message: "injects the entire secrets context into the runner",
  func: "tojson",
  hits: (arg: Spanned) => arg.expr.type === "context" && isSecrets(arg.expr),
  context:
    (count) =>
    (expr): number =>
      Bool.match(isDynamicSecretIndex(expr.parts), {
        onTrue: () => ONE,
        onFalse: () => total(count)(expr.parts),
      }),
});
