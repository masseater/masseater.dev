import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { anonymousDefinition } from "#/features/audit-workflows/rules/anonymous-definition.ts";
import { cachePoisoning } from "#/features/audit-workflows/rules/cache-poisoning.ts";
import { concurrencyLimits } from "#/features/audit-workflows/rules/concurrency-limits.ts";
import { dangerousTriggers } from "#/features/audit-workflows/rules/dangerous-triggers.ts";
import { excessivePermissions } from "#/features/audit-workflows/rules/excessive-permissions.ts";
import { misfeature } from "#/features/audit-workflows/rules/misfeature.ts";
import { selfHostedRunner } from "#/features/audit-workflows/rules/self-hosted-runner.ts";
import { undocumentedPermissions } from "#/features/audit-workflows/rules/undocumented-permissions.ts";

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
