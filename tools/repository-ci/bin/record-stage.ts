#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { recordStage } from "#/features/record-stage/index.ts";

runMain("record-stage")(recordStage);
