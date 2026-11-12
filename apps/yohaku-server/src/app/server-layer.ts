import { NodeServices } from "@effect/platform-node";
import { YohakuRpcs } from "@masseater.dev/yohaku-protocol";
import { Layer } from "effect";
import { SecureRandom } from "effect/crypto";
import { RpcServer } from "effect/rpc";

import { databaseLayer } from "#shared/database";

import { handlersLayer } from "./handlers.ts";
import { mcpLayer } from "./mcp-layer.ts";
import { rpcTransportLayer } from "./transport.ts";
import { understandingLayer } from "./understanding.ts";

/** @internal */
const appLayer = RpcServer.layer(YohakuRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(rpcTransportLayer),
  Layer.provide(understandingLayer),
  Layer.provideMerge(mcpLayer),
  Layer.provideMerge(databaseLayer),
  Layer.provideMerge(SecureRandom.layerWebCrypto),
);

/** @internal */
const platformLayer = NodeServices.layer;

export { appLayer, platformLayer };
