import { AredokoRpcs } from "@masseater.dev/aredoko-protocol";
import { EndpointDirectory, transportLayer } from "@masseater.dev/local-server/node";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { RpcServer } from "effect/rpc";

import { blmLayer, libraryLayer } from "#features/library";
import { databaseLayer } from "#shared/database";
import { Settings } from "#shared/settings";

import { embedderLayer } from "./embedder-layer.ts";
import { handlersLayer } from "./handlers.ts";

const endpointDirectoryLayer = Layer.effect(
  EndpointDirectory,
  Settings.pipe(Effect.map(({ dataDirectory }) => dataDirectory)),
);

const settingsTransportLayer = transportLayer.pipe(Layer.provide(endpointDirectoryLayer));

/** @internal */
const serverLayer = RpcServer.layer(AredokoRpcs).pipe(
  Layer.provide(handlersLayer),
  Layer.provide(libraryLayer),
  Layer.provideMerge(blmLayer),
  Layer.provide(settingsTransportLayer),
  Layer.provideMerge(embedderLayer),
  Layer.provideMerge(databaseLayer),
  Layer.provide(FetchHttpClient.layer),
);

export { serverLayer };
