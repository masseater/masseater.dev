import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { generateData } from "#/features/generate-data/index.ts";

const output = new URL("../native/core/data", import.meta.url).pathname;
const services = Layer.merge(NodeServices.layer, FetchHttpClient.layer);

runMain(generateData(output).pipe(Effect.provide(services)));
