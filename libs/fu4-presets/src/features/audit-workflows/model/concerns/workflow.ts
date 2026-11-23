import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { anonymousDefinition } from "#/features/audit-workflows/model/rules/anonymous-definition.ts";
import { cachePoisoning } from "#/features/audit-workflows/model/rules/cache-poisoning.ts";
import { concurrencyLimits } from "#/features/audit-workflows/model/rules/concurrency-limits.ts";
import { dangerousTriggers } from "#/features/audit-workflows/model/rules/dangerous-triggers.ts";
import { excessivePermissions } from "#/features/audit-workflows/model/rules/excessive-permissions.ts";
import { misfeature } from "#/features/audit-workflows/model/rules/misfeature.ts";
import { selfHostedRunner } from "#/features/audit-workflows/model/rules/self-hosted-runner.ts";
import { undocumentedPermissions } from "#/features/audit-workflows/model/rules/undocumented-permissions.ts";

export const WORKFLOW: readonly Audit[] = [
  dangerousTriggers,
  cachePoisoning,
  selfHostedRunner,
  excessivePermissions,
  undocumentedPermissions,
  concurrencyLimits,
  anonymousDefinition,
  misfeature,
];
