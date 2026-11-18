import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { generateData } from "#/features/generate-data/index.ts";

const output = new URL("../src/shared/data", import.meta.url).pathname;
const services = FetchHttpClient.layer.pipe(Layer.provideMerge(nodeServices));

runMain(generateData(output).pipe(Effect.provide(services)));
