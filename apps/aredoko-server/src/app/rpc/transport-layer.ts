import { NodeSocketServer } from "@effect/platform-node";
import { HOST } from "@masseater.dev/aredoko-protocol";
import { Effect, Layer } from "effect";
import { RpcSerialization, RpcServer } from "effect/rpc";

import { endpointFileLayer } from "./endpoint-file-layer.ts";
import { ServerToken, serverTokenLayer } from "./server-token.ts";

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
const transportLayer = Layer.mergeAll(RpcServer.layerProtocolSocketServer, endpointFileLayer).pipe(
  Layer.provide(RpcSerialization.layerJsonRpc()),
  Layer.provide(socketServerLayer),
  Layer.provide(serverTokenLayer),
);

export { transportLayer };
