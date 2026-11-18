import type { Audit } from "#/features/zizmor/model/audit.ts";
import { dependabotCooldown } from "#/features/zizmor/rules/dependabot-cooldown.ts";
import { dependabotExecution } from "#/features/zizmor/rules/dependabot-execution.ts";
import { insecureUrlScheme } from "#/features/zizmor/rules/insecure-url-scheme.ts";

export const CONFIG: readonly Audit[] = [
  dependabotExecution,
  dependabotCooldown,
  insecureUrlScheme,
];
