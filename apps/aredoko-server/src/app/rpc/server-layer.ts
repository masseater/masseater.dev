import { AredokoRpcs } from "@masseater.dev/aredoko-protocol";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { RpcServer } from "effect/rpc";

import { blmLayer, libraryLayer } from "#features/library";
import { databaseLayer } from "#shared/database";

import { embedderLayer } from "./embedder-layer.ts";
import { handlersLayer } from "./handlers.ts";
import { transportLayer } from "./transport-layer.ts";

/** @internal */
const serverLayer = RpcServer.layer(AredokoRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(libraryLayer),
  Layer.provideMerge(blmLayer),
  Layer.provide(transportLayer),
  Layer.provideMerge(embedderLayer),
  Layer.provideMerge(databaseLayer),
  Layer.provide(FetchHttpClient.layer),
);

export { serverLayer };
