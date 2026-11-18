#!/usr/bin/env node
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import { watashi } from "./cli.ts";
import { VERSION } from "./version.ts";

const services = Layer.mergeAll(nodeServices, FetchHttpClient.layer);

runMain(Command.run(watashi, { version: VERSION }).pipe(Effect.provide(services)));
