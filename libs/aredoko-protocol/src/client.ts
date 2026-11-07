import { Context, Effect, Layer } from "effect";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { Socket } from "effect/socket";

import { AredokoRpcs } from "./aredoko-rpcs.ts";
import { ServerUrl } from "./server-url.ts";

/** @internal */
class AredokoClient extends Context.Service<AredokoClient>()(
  "@masseater.dev/aredoko-protocol/client/AredokoClient",
  {
    make: RpcClient.make(AredokoRpcs),
  },
) {}

const socketLayer = Layer.unwrap(
  Effect.gen(function* socket() {
    const { url } = yield* ServerUrl;
    return Socket.layerWebSocket(url);
  }),
);

/** @internal */
const aredokoClientLayer = Layer.effect(AredokoClient, AredokoClient.make).pipe(
  Layer.provide(RpcClient.layerProtocolSocket({ retryTransientErrors: true })),
  Layer.provide(RpcSerialization.layerJsonRpc()),
  Layer.provide(socketLayer),
  Layer.provide(Socket.layerWebSocketConstructorGlobal),
);

export { AredokoClient, aredokoClientLayer };
