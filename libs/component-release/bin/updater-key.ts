#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";

import { updaterKey } from "#/features/publish-updates/index.ts";

runMain("updater-key")(updaterKey);
