#!/usr/bin/env node
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import { watashi } from "./cli.ts";
import { VERSION } from "./version.ts";

const services = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);

NodeRuntime.runMain(Command.run(watashi, { version: VERSION }).pipe(Effect.provide(services)));
