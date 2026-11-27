#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { updaterKey } from "#/features/publish-updates/index.ts";

runMain("updater-key")(updaterKey);
