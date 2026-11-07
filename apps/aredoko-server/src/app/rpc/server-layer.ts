import { NodeSocketServer } from "@effect/platform-node";
import { AredokoRpcs, HOST } from "@masseater.dev/aredoko-protocol";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { RpcSerialization, RpcServer } from "effect/rpc";

import { blmLayer, libraryLayer } from "#features/library";
import { databaseLayer } from "#shared/database";

import { embedderLayer } from "./embedder-layer.ts";
import { endpointFileLayer } from "./endpoint-file-layer.ts";
import { handlersLayer } from "./handlers.ts";

const ANY_PORT = 0;

const transport = Layer.mergeAll(RpcServer.layerProtocolSocketServer, endpointFileLayer).pipe(
  Layer.provide(RpcSerialization.layerJsonRpc()),
  Layer.provide(NodeSocketServer.layerWebSocket({ host: HOST, port: ANY_PORT })),
);

/** @internal */
const serverLayer = RpcServer.layer(AredokoRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(libraryLayer),
  Layer.provideMerge(blmLayer),
  Layer.provide(transport),
  Layer.provideMerge(embedderLayer),
  Layer.provideMerge(databaseLayer),
  Layer.provide(FetchHttpClient.layer),
);

export { serverLayer };
