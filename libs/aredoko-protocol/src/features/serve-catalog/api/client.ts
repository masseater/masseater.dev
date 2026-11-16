import { socketProtocolLayer } from "@masseater.dev/local-server";
import { Context, Layer } from "effect";
import { RpcClient } from "effect/rpc";

import { AredokoRpcs } from "#/features/serve-catalog/model/aredoko-rpcs.ts";

/** @internal */
export class AredokoClient extends Context.Service<AredokoClient>()(
  "@masseater.dev/aredoko-protocol/features/serve-catalog/api/client/AredokoClient",
  {
    make: RpcClient.make(AredokoRpcs),
  },
) {}

/** @internal */
export const aredokoClientLayer = Layer.effect(AredokoClient, AredokoClient.make).pipe(
  Layer.provide(socketProtocolLayer),
);
