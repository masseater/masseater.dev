#!/usr/bin/env node
import { runMain } from "@r_masseater/node-main";

import { publishZennBranch } from "#/features/publish-zenn-branch/index.ts";

runMain("zenn-publish")(publishZennBranch);
