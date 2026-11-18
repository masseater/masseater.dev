#!/usr/bin/env node
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { Command } from "effect/cli";

import { kogane } from "./cli.ts";
import { VERSION } from "./version.ts";

NodeRuntime.runMain(
  Command.run(kogane, { version: VERSION }).pipe(Effect.provide(NodeServices.layer)),
);
