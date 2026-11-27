import { runMain } from "@r_masseater/node-main";
import { Command } from "effect/cli";

import { cli } from "#/app/cli.ts";
import pkg from "#package.json" with { type: "json" };

runMain(pkg.name)(Command.run(cli, { version: pkg.version }));
