#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { deployProduction } from "#/features/deploy-production/index.ts";

runMain("deploy-production")(deployProduction);
