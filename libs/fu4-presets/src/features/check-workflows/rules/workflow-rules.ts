import type { Rule } from "@r_masseater/fu4";

import { deprecatedCommands } from "./deprecated-commands.ts";
import { envVar } from "./env-var.ts";
import { glob } from "./glob.ts";
import { id } from "./id.ts";
import { ifCond } from "./if-cond.ts";
import { permissions } from "./permissions.ts";

export const WORKFLOW_RULES: Readonly<Record<string, Rule>> = {
  "deprecated-commands": deprecatedCommands,
  "env-var": envVar,
  glob,
  id,
  "if-cond": ifCond,
  permissions,
};
