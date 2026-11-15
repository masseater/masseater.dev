import { Worker } from "node:worker_threads";

import { NodeWorker } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { workerEmbedderLayer } from "#/shared/embedding/index.ts";
import { Settings } from "#/shared/settings/index.ts";

/** @internal */
export const embedderLayer = Layer.unwrap(
  Effect.gen(function* embedderWorker() {
    const { embedderWorker: url } = yield* Settings;
    return workerEmbedderLayer.pipe(Layer.provide(NodeWorker.layer(() => new Worker(url))));
  }),
);
