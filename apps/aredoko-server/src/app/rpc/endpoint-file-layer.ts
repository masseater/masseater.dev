import { ENDPOINT_FILE, ServerEndpoint } from "@masseater.dev/aredoko-protocol";
import { Effect, FileSystem, Layer, Match, Option, Path, Schema } from "effect";
import type { NetAddress } from "effect/net";
import { SocketServer } from "effect/socket";

import { Settings } from "#shared/settings";

const encodeEndpoint = Schema.encodeEffect(Schema.fromJsonString(ServerEndpoint));

const portOf = Match.type<NetAddress.SocketAddress>().pipe(
  Match.tag("UnixPathAddress", () => Option.none<number>()),
  Match.orElse(({ port }) => Option.some(port)),
);

/** @internal */
const endpointFileLayer = Layer.effectDiscard(
  Effect.gen(function* endpointFile() {
    const { address } = yield* SocketServer.SocketServer;
    const { dataDirectory } = yield* Settings;
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const port = yield* Effect.fromOption(portOf(address));
    const text = yield* encodeEndpoint({ port });
    const file = path.join(dataDirectory, ENDPOINT_FILE);
    yield* fs.makeDirectory(dataDirectory, { recursive: true });
    yield* Effect.acquireRelease(fs.writeFileString(file, text), () =>
      fs.remove(file).pipe(Effect.ignore),
    );
  }),
);

export { endpointFileLayer };
