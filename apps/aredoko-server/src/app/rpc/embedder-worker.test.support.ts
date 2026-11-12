import { NodeWorkerRunner } from "@effect/platform-node";
import { runMain } from "@masseater.dev/node-main";
import { Array, Effect, Layer, pipe } from "effect";
import { RpcServer } from "effect/rpc";

import { EmbedderRpcs } from "#shared/embedding";

const DEVICE = "test";
const VECTOR_DIMENSIONS = 768;
const UNIT = 1;

const VECTOR = Array.makeBy(VECTOR_DIMENSIONS, () => UNIT);

const vectorsFor = (inputs: readonly unknown[]): Effect.Effect<readonly (readonly number[])[]> =>
  Effect.succeed(
    pipe(
      inputs,
      Array.map(() => VECTOR),
    ),
  );

const handlersLayer = EmbedderRpcs.toLayer(
  EmbedderRpcs.of({
    Device: () => Effect.succeed(DEVICE),
    EmbedQuery: () => Effect.succeed(VECTOR),
    EmbedDocuments: ({ texts }) => vectorsFor(texts),
    EmbedImages: ({ pngs }) => vectorsFor(pngs),
  }),
);

const workerLayer = RpcServer.layer(EmbedderRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer),
);

runMain("aredoko-embedder-test")(Layer.launch(workerLayer));
