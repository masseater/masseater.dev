import type { Rule } from "@r_masseater/fu4";

import { credentials } from "./credentials.ts";
import { jobNeeds } from "./job-needs.ts";
import { matrix } from "./matrix.ts";
import { runnerLabel } from "./runner-label.ts";
import { shellName } from "./shell-name.ts";

export const JOB_RULES: Readonly<Record<string, Rule>> = {
  credentials,
  "job-needs": jobNeeds,
  matrix,
  "runner-label": runnerLabel,
  "shell-name": shellName,
};
