import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { botConditions } from "#/features/audit-workflows/model/rules/bot-conditions.ts";
import { githubEnv } from "#/features/audit-workflows/model/rules/github-env.ts";
import { insecureCommands } from "#/features/audit-workflows/model/rules/insecure-commands.ts";
import { obfuscation } from "#/features/audit-workflows/model/rules/obfuscation.ts";
import { templateInjection } from "#/features/audit-workflows/model/rules/template-injection.ts";
import { unsoundCondition } from "#/features/audit-workflows/model/rules/unsound-condition.ts";
import { unsoundContains } from "#/features/audit-workflows/model/rules/unsound-contains.ts";
import { unsoundTernary } from "#/features/audit-workflows/model/rules/unsound-ternary.ts";

export const INJECTION: readonly Audit[] = [
  templateInjection,
  githubEnv,
  insecureCommands,
  obfuscation,
  unsoundCondition,
  unsoundContains,
  unsoundTernary,
  botConditions,
];
