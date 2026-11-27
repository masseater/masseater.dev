import { layer as nodeWorkerRunner } from "@effect/platform-node/NodeWorkerRunner";
import { runMain } from "@r_masseater/node-main";
import { Effect, Layer } from "effect";
import { RpcServer, RpcWorker } from "effect/rpc";

import {
  Embedder,
  EmbedderRpcs,
  WorkerSettings,
  localEmbedderLayer,
} from "#/shared/embedding/index.ts";

const handlersLayer = EmbedderRpcs.toLayer(
  Effect.gen(function* handlers() {
    const embedder = yield* Embedder;
    return EmbedderRpcs.of({
      Device: () => Effect.succeed(embedder.device),
      EmbedQuery: ({ query }) => embedder.embedQuery(query),
      EmbedDocuments: ({ texts }) => embedder.embedDocuments(texts),
      EmbedImages: ({ pngs }) => embedder.embedImages(pngs),
    });
  }),
);

const embedderLayer = WorkerSettings.pipe(
  RpcWorker.initialMessage,
  Effect.map(({ modelDirectory }) => localEmbedderLayer(modelDirectory)),
  Effect.orDie,
  Layer.unwrap,
);

const workerLayer = RpcServer.layer(EmbedderRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(embedderLayer),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(nodeWorkerRunner),
);

workerLayer.pipe(Layer.launch, runMain("aredoko-embedder"));
