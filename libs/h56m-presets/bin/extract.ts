import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect } from "effect";

import { extractPresets } from "#/features/extract-presets/index.ts";

runMain(extractPresets(new URL("..", import.meta.url).pathname).pipe(Effect.provide(nodeServices)));
