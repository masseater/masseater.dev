import { Array as Arr, Option, Predicate, Record as Rec } from "effect";

import type { Permissions } from "#/entities/workflow/index.ts";
import { NOOP, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";
import scopes from "#/shared/data/permissions.json" with { type: "json" };
import { quote, quotes, sortedQuotes } from "#/shared/text/index.ts";

const SCOPES: Readonly<Record<string, readonly string[]>> = scopes;
const ALL = new Set(["write-all", "read-all"]);

const checkScopes = (fail: Fail, permissions: Permissions): void => {
  for (const scope of Rec.values(permissions.scopes)) {
    const name = scope.name.value;
    const values = Rec.get(SCOPES, name);
    if (Option.isNone(values)) {
      fail(
        scope.name,
        `unknown permission scope ${quote(name)}. all available permission scopes are ${sortedQuotes(Rec.keys(SCOPES))}`,
      );
    } else if (!Arr.contains(values.value, scope.value.value)) {
      fail(
        scope.value,
        `${quote(scope.value.value)} is invalid as permission of scope ${quote(name)}. available values are ${quotes(values.value)}`,
      );
    }
  }
};

const check =
  (fail: Fail) =>
  (permissions: Permissions | undefined): void => {
    for (const found of Option.toArray(Option.fromNullishOr(permissions))) {
      if (Predicate.isUndefined(found.all)) {
        checkScopes(fail, found);
      } else if (!ALL.has(found.all.value)) {
        fail(
          found.all,
          `${quote(found.all.value)} is invalid for permission for all the scopes. available values are "read-all", "write-all" or {}`,
        );
      }
    }
  };

export const permissions = workflowRule({
  description: "Reports unknown permission scopes and invalid permission values",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#permissions",
  visitor: (fail): Visitor => ({
    ...NOOP,
    workflowPre: (workflow): void => {
      check(fail)(workflow.permissions);
    },
    jobPre: (job): void => {
      check(fail)(job.permissions);
    },
  }),
});
