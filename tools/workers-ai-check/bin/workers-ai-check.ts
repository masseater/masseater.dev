import { runMain } from "@masseater.dev/node-main";

import { check } from "#/app/check.ts";

runMain("workers-ai-check")(check());
