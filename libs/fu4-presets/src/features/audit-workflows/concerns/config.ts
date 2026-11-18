import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { dependabotCooldown } from "#/features/audit-workflows/rules/dependabot-cooldown.ts";
import { dependabotExecution } from "#/features/audit-workflows/rules/dependabot-execution.ts";
import { insecureUrlScheme } from "#/features/audit-workflows/rules/insecure-url-scheme.ts";

export const CONFIG: readonly Audit[] = [
  dependabotExecution,
  dependabotCooldown,
  insecureUrlScheme,
];
