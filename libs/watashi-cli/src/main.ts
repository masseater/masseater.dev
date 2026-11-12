#!/usr/bin/env node
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import pkg from "#package.json" with { type: "json" };

import { watashi } from "./cli.ts";

const services = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);

NodeRuntime.runMain(Command.run(watashi, { version: pkg.version }).pipe(Effect.provide(services)));
