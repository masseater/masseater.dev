import { Effect, FileSystem, Layer, Path, Redacted, Schema } from "effect";
import { SocketServer } from "effect/socket";

import { EndpointDirectory } from "./endpoint-directory.ts";
import { ENDPOINT_FILE, ServerEndpoint } from "./endpoint.ts";
import { ServerToken } from "./server-token.ts";
import { portOf } from "./socket-port.ts";

const OWNER_ONLY = 0o600;

const encodeEndpoint = Schema.encodeEffect(Schema.fromJsonString(ServerEndpoint));

const endpointText = Effect.gen(function* endpointText() {
  const { address } = yield* SocketServer.SocketServer;
  const { token } = yield* ServerToken;
  const port = yield* Effect.fromOption(portOf(address));
  return yield* encodeEndpoint({ port, token: Redacted.value(token) });
});

/** @internal */
const endpointFileLayer = Layer.effectDiscard(
  Effect.gen(function* endpointFile() {
    const dataDirectory = yield* EndpointDirectory;
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
