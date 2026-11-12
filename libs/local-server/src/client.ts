import { Effect, Layer } from "effect";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { Socket } from "effect/socket";

import { ServerUrl } from "./server-url.ts";

const socketLayer = Layer.unwrap(
  Effect.gen(function* socket() {
    const { url } = yield* ServerUrl;
    return Socket.layerWebSocket(url);
  }),
);

/** @internal */
const socketProtocolLayer = RpcClient.layerProtocolSocket({ retryTransientErrors: true }).pipe(
  Layer.provide(RpcSerialization.layerJsonRpc()),
  Layer.provide(socketLayer),
  Layer.provide(Socket.layerWebSocketConstructorGlobal),
);

export { socketProtocolLayer };
