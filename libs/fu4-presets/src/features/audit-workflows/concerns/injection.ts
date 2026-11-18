import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { botConditions } from "#/features/audit-workflows/rules/bot-conditions.ts";
import { githubEnv } from "#/features/audit-workflows/rules/github-env.ts";
import { insecureCommands } from "#/features/audit-workflows/rules/insecure-commands.ts";
import { obfuscation } from "#/features/audit-workflows/rules/obfuscation.ts";
import { templateInjection } from "#/features/audit-workflows/rules/template-injection.ts";
import { unsoundCondition } from "#/features/audit-workflows/rules/unsound-condition.ts";
import { unsoundContains } from "#/features/audit-workflows/rules/unsound-contains.ts";
import { unsoundTernary } from "#/features/audit-workflows/rules/unsound-ternary.ts";

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
