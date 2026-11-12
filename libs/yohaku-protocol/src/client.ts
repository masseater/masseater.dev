import { socketProtocolLayer } from "@masseater.dev/local-server";
import { Context, Layer } from "effect";
import { RpcClient } from "effect/rpc";

import { YohakuRpcs } from "./yohaku-rpcs.ts";

/** @internal */
class YohakuClient extends Context.Service<YohakuClient>()(
  "@masseater.dev/yohaku-protocol/client/YohakuClient",
  {
    make: RpcClient.make(YohakuRpcs),
  },
) {}

/** @internal */
const yohakuClientLayer = Layer.effect(YohakuClient, YohakuClient.make).pipe(
  Layer.provide(socketProtocolLayer),
);

export { YohakuClient, yohakuClientLayer };
