#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { pruneCaches } from "#/features/prune-caches/index.ts";

runMain("prune-caches")(pruneCaches);
