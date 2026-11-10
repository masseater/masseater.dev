import { ENDPOINT_FILE, ServerEndpoint } from "@masseater.dev/aredoko-protocol";
import { Effect, FileSystem, Layer, Match, Option, Path, Redacted, Schema } from "effect";
import type { NetAddress } from "effect/net";
import { SocketServer } from "effect/socket";

import { Settings } from "#shared/settings";

import { ServerToken } from "./server-token.ts";

const OWNER_ONLY = 0o600;

const encodeEndpoint = Schema.encodeEffect(Schema.fromJsonString(ServerEndpoint));

const portOf = Match.type<NetAddress.SocketAddress>().pipe(
  Match.tag("UnixPathAddress", () => Option.none<number>()),
  Match.orElse(({ port }) => Option.some(port)),
);

const endpointText = Effect.gen(function* endpointText() {
  const { address } = yield* SocketServer.SocketServer;
  const { token } = yield* ServerToken;
  const port = yield* Effect.fromOption(portOf(address));
  return yield* encodeEndpoint({ port, token: Redacted.value(token) });
});

/** @internal */
const endpointFileLayer = Layer.effectDiscard(
  Effect.gen(function* endpointFile() {
    const { dataDirectory } = yield* Settings;
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const text = yield* endpointText;
    const file = path.join(dataDirectory, ENDPOINT_FILE);
    const remove = fs.remove(file).pipe(Effect.ignore);
    yield* fs.makeDirectory(dataDirectory, { recursive: true });
    yield* remove;
    yield* Effect.acquireRelease(
      fs.writeFileString(file, text, { mode: OWNER_ONLY }),
      () => remove,
    );
  }),
);

export { endpointFileLayer };
