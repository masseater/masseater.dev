import { EndpointDirectory, transportLayer } from "@masseater.dev/local-server/node";
import { Effect, Layer } from "effect";

import { Settings } from "#shared/settings";

const endpointDirectoryLayer = Layer.effect(
  EndpointDirectory,
  Settings.pipe(Effect.map(({ dataDirectory }) => dataDirectory)),
);

/** @internal */
const rpcTransportLayer = transportLayer.pipe(Layer.provide(endpointDirectoryLayer));

export { rpcTransportLayer };
