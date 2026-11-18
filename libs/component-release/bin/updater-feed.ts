#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";

import { updaterFeed } from "#/features/publish-updates/index.ts";

runMain("updater-feed")(updaterFeed);
