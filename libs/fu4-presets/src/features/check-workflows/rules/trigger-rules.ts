import type { Rule } from "@r_masseater/fu4";

import { events } from "./events.ts";
import { workflowCall } from "./workflow-call.ts";

export const TRIGGER_RULES: Readonly<Record<string, Rule>> = {
  events,
  "workflow-call": workflowCall,
};
