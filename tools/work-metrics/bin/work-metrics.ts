import { runMainWith } from "@masseater.dev/node-main";
import { Command } from "effect/cli";

import { cli } from "#/app/cli.ts";
import { githubCredentials } from "#/shared/api/github.ts";
import pkg from "#package.json" with { type: "json" };

runMainWith({ serviceName: pkg.name, services: githubCredentials })(
  Command.run(cli, { version: pkg.version }),
);
