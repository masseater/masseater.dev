import { socketProtocolLayer } from "@masseater.dev/local-server";
import { Context, Layer } from "effect";
import { RpcClient } from "effect/rpc";

import { AredokoRpcs } from "./aredoko-rpcs.ts";

/** @internal */
class AredokoClient extends Context.Service<AredokoClient>()(
  "@masseater.dev/aredoko-protocol/client/AredokoClient",
  {
    make: RpcClient.make(AredokoRpcs),
  },
) {}

/** @internal */
const aredokoClientLayer = Layer.effect(AredokoClient, AredokoClient.make).pipe(
  Layer.provide(socketProtocolLayer),
);

export { AredokoClient, aredokoClientLayer };
