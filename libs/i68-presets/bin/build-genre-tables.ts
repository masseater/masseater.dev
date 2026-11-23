import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { writeGenreTables } from "#/features/build-style-table/index.ts";
import { tableCache } from "#/shared/lib/cache.ts";

const services = FetchHttpClient.layer.pipe(Layer.provideMerge(nodeServices));

runMain(Effect.flatMap(tableCache, writeGenreTables).pipe(Effect.provide(services)));
