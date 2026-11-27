import { runMain } from "@r_masseater/node-main";

import { check } from "#/app/check.ts";

runMain("workers-ai-check")(check());
