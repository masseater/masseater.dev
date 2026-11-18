#!/usr/bin/env node
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect } from "effect";
import { Command } from "effect/cli";

import { kogane } from "./cli.ts";
import { VERSION } from "./version.ts";

runMain(Command.run(kogane, { version: VERSION }).pipe(Effect.provide(nodeServices)));
