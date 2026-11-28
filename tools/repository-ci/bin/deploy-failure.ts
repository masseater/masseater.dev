#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { reportDeployFailure } from "#/features/report-deploy-failure/index.ts";

runMain("deploy-failure")(reportDeployFailure);
