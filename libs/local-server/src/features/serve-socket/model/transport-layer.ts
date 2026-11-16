import { NodeSocketServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { RpcSerialization, RpcServer } from "effect/rpc";

import { HOST, ServerToken, serverTokenLayer } from "#/entities/endpoint/index.ts";

import { endpointFileLayer } from "./endpoint-file-layer.ts";

const ANY_PORT = 0;

const socketServerLayer = Layer.unwrap(
  Effect.gen(function* socketServer() {
    const { presentedBy } = yield* ServerToken;
    return NodeSocketServer.layerWebSocket({
      host: HOST,
      port: ANY_PORT,
      verifyClient: presentedBy,
    });
  }),
);

/** @internal */
export const transportLayer = Layer.mergeAll(
  RpcServer.layerProtocolSocketServer,
  endpointFileLayer,
).pipe(
  Layer.provide(RpcSerialization.layerJsonRpc()),
  Layer.provide(socketServerLayer),
  Layer.provideMerge(serverTokenLayer),
);
