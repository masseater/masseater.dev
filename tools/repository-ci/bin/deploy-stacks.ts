#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { planDeploys } from "#/features/plan-deploys/index.ts";

runMain("deploy-stacks")(planDeploys);
