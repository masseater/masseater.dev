import type { Audit } from "#/features/zizmor/model/audit.ts";
import { botConditions } from "#/features/zizmor/rules/bot-conditions.ts";
import { githubEnv } from "#/features/zizmor/rules/github-env.ts";
import { insecureCommands } from "#/features/zizmor/rules/insecure-commands.ts";
import { obfuscation } from "#/features/zizmor/rules/obfuscation.ts";
import { templateInjection } from "#/features/zizmor/rules/template-injection.ts";
import { unsoundCondition } from "#/features/zizmor/rules/unsound-condition.ts";
import { unsoundContains } from "#/features/zizmor/rules/unsound-contains.ts";
import { unsoundTernary } from "#/features/zizmor/rules/unsound-ternary.ts";

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
