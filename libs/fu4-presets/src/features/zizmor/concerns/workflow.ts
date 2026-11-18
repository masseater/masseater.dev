import type { Audit } from "#/features/zizmor/model/audit.ts";
import { anonymousDefinition } from "#/features/zizmor/rules/anonymous-definition.ts";
import { cachePoisoning } from "#/features/zizmor/rules/cache-poisoning.ts";
import { concurrencyLimits } from "#/features/zizmor/rules/concurrency-limits.ts";
import { dangerousTriggers } from "#/features/zizmor/rules/dangerous-triggers.ts";
import { excessivePermissions } from "#/features/zizmor/rules/excessive-permissions.ts";
import { misfeature } from "#/features/zizmor/rules/misfeature.ts";
import { selfHostedRunner } from "#/features/zizmor/rules/self-hosted-runner.ts";
import { undocumentedPermissions } from "#/features/zizmor/rules/undocumented-permissions.ts";

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
