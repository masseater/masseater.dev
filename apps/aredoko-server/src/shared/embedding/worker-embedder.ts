import { Effect, Layer } from "effect";
import { RpcClient, RpcWorker } from "effect/rpc";
import type { RpcClientError } from "effect/rpc";

import { Settings } from "#shared/settings";

import { EmbedderRpcs, WorkerSettings } from "./embedder-rpcs.ts";
import { Embedder } from "./embedder.ts";
import { EmbeddingFailed } from "./embedding-failed.ts";

const WORKERS = 1;

const failed = (cause: unknown): EmbeddingFailed => EmbeddingFailed.make({ cause });

const settingsMessage = RpcWorker.layerInitialMessage(
  WorkerSettings,
  Effect.gen(function* workerSettings() {
    const { modelDirectory } = yield* Settings;
    return { modelDirectory };
  }),
);

const throughWorker = <Value>(
  request: Effect.Effect<Value, EmbeddingFailed | RpcClientError.RpcClientError>,
): Effect.Effect<Value, EmbeddingFailed> =>
  request.pipe(Effect.catchTag("RpcClientError", (cause) => Effect.fail(failed(cause))));

/** @internal */
const workerEmbedderLayer = Layer.effect(
  Embedder,
  Effect.gen(function* workerEmbedder() {
    const {
      Device: deviceRpc,
      EmbedQuery: embedQueryRpc,
      EmbedDocuments: embedDocumentsRpc,
      EmbedImages: embedImagesRpc,
    } = yield* RpcClient.make(EmbedderRpcs);
    const device = yield* deviceRpc().pipe(Effect.mapError(failed));
    return Embedder.of({
      device,
      embedQuery: (query) => throughWorker(embedQueryRpc({ query })),
      embedDocuments: (texts) => throughWorker(embedDocumentsRpc({ texts })),
      embedImages: (pngs) => throughWorker(embedImagesRpc({ pngs })),
    });
  }),
).pipe(
  Layer.provide(RpcClient.layerProtocolWorker({ size: WORKERS })),
  Layer.provide(settingsMessage),
);

export { workerEmbedderLayer };
