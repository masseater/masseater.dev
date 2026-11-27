#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { updaterFeed } from "#/features/publish-updates/index.ts";

runMain("updater-feed")(updaterFeed);
