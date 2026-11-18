import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Effect } from "effect";

import { extractPresets } from "#/features/extract-presets/index.ts";

runMain(
  extractPresets(new URL("..", import.meta.url).pathname).pipe(Effect.provide(NodeServices.layer)),
);
