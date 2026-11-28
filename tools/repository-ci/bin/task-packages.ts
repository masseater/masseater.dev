#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { listTaskPackages } from "#/features/list-task-packages/index.ts";

runMain("task-packages")(listTaskPackages);
