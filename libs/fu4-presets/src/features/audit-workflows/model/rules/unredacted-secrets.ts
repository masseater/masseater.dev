import { childOf } from "#/entities/expression-tree/index.ts";
import type { Spanned } from "#/entities/expression-tree/index.ts";
import { secretAudit, total } from "#/features/audit-workflows/lib/secret-count.ts";

const isSecret = childOf("secrets");

export const unredactedSecrets = secretAudit({
  ident: "unredacted-secrets",
  desc: "leaked secret values",
  message: "bypasses secret redaction",
  func: "fromjson",
  hits: (arg: Spanned) => arg.expr.type === "context" && isSecret(arg.expr),
  context:
    (count) =>
    (expr): number =>
      total(count)(expr.parts),
});
