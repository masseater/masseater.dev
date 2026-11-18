#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Command } from "effect/cli";

import { cli } from "#/app/cli.ts";
import pkg from "#package.json" with { type: "json" };

runMain(pkg.name)(Command.run(cli, { version: pkg.version }));
