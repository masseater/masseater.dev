import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { writeStyleTables } from "#/features/build-style-table/index.ts";

const output = new URL("../src/features/check-style/data", import.meta.url).pathname;
const services = FetchHttpClient.layer.pipe(Layer.provideMerge(nodeServices));

runMain(writeStyleTables(output).pipe(Effect.provide(services)));
