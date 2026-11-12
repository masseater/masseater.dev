import { NodeWorkerRunner } from "@effect/platform-node";
import { runMain } from "@masseater.dev/node-main";
import { Effect, Layer } from "effect";
import { RpcServer, RpcWorker } from "effect/rpc";

import { Embedder, EmbedderRpcs, WorkerSettings, localEmbedderLayer } from "#shared/embedding";

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

const embedderLayer = Layer.unwrap(
  RpcWorker.initialMessage(WorkerSettings).pipe(
    Effect.map(({ modelDirectory }) => localEmbedderLayer(modelDirectory)),
    Effect.orDie,
  ),
);

const workerLayer = RpcServer.layer(EmbedderRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(embedderLayer),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer),
);

runMain("aredoko-embedder")(Layer.launch(workerLayer));
