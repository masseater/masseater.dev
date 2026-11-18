import { ENDPOINT_FILE, ServerUrl, awaitEndpoint } from "@masseater.dev/local-server";
import { Context, Effect, FileSystem, Layer, Path } from "effect";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { Socket } from "effect/socket";

import { KoganeRpcs } from "#/shared/api/rpcs.ts";

/** @internal */
export class KoganeClient extends Context.Service<KoganeClient>()(
  "@r_masseater/kogane/features/ask-suggestions/model/client/KoganeClient",
  { make: RpcClient.make(KoganeRpcs) },
) {}

const serverUrlLayer = (
  dataDirectory: string,
): Layer.Layer<ServerUrl, never, FileSystem.FileSystem | Path.Path> =>
  Layer.effect(
    ServerUrl,
    Effect.gen(function* serverUrl() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const endpoint = fs.readFileString(path.join(dataDirectory, ENDPOINT_FILE));
      return { url: awaitEndpoint(endpoint) };
    }),
  );

const socketLayer = Layer.unwrap(
  Effect.gen(function* socket() {
    const { url } = yield* ServerUrl;
    return Socket.layerWebSocket(url);
  }),
);

const protocolLayer = RpcClient.layerProtocolSocket({ retryTransientErrors: false }).pipe(
  Layer.provide(RpcSerialization.layerJsonRpc()),
  Layer.provide(socketLayer),
  Layer.provide(Socket.layerWebSocketConstructorGlobal),
);

/** @internal */
export const koganeClientLayer = (
  dataDirectory: string,
): Layer.Layer<KoganeClient, never, FileSystem.FileSystem | Path.Path> =>
  Layer.effect(KoganeClient, KoganeClient.make).pipe(
    Layer.provide(protocolLayer),
    Layer.provide(serverUrlLayer(dataDirectory)),
  );
