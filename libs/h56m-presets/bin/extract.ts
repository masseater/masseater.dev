import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Effect } from "effect";

import { extractPresets } from "#/features/extract-presets/index.ts";

const output = new URL("..", import.meta.url).pathname;
const manifest = new URL("../../../Cargo.toml", import.meta.url).pathname;

runMain(extractPresets({ manifest, output }).pipe(Effect.provide(NodeServices.layer)));
