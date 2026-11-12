import type { YohakuRpcs } from "@masseater.dev/yohaku-protocol";
import type { RpcGroup } from "effect/rpc";

/** @internal */
type Handlers = RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof YohakuRpcs>>;

export type { Handlers };
