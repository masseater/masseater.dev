import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Boolean as Bool, Config, Effect } from "effect";

import { extractPresets } from "#/features/extract-presets/index.ts";

const output = new URL("..", import.meta.url).pathname;
const manifest = new URL("../../../Cargo.toml", import.meta.url).pathname;

const installInCi = Config.all([
  Config.Boolean("CI").pipe(Config.withDefault(false)),
  Config.String("npm_lifecycle_event").pipe(Config.withDefault("")),
]).pipe(Config.map(([inCi, event]) => inCi && event === "prepare"));

const extract = Effect.gen(function* extract() {
  const skipped = yield* installInCi;
  yield* Bool.match(skipped, {
    onTrue: () => Effect.void,
    onFalse: () => extractPresets({ manifest, output }),
  });
});

runMain(extract.pipe(Effect.provide(NodeServices.layer)));
