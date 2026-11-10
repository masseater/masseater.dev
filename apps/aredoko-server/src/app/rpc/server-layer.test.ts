import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import {
  AredokoClient,
  ENDPOINT_FILE,
  HOST,
  ServerEndpoint,
  ServerUrl,
  TOKEN_PARAMETER,
  aredokoClientLayer,
  awaitEndpoint,
} from "@masseater.dev/aredoko-protocol";
import { Effect, FileSystem, Layer, Option, Path, Schema, String, pipe } from "effect";

import { Settings } from "#shared/settings";

import { VERSION } from "./handlers.ts";
import { serverLayer } from "./server-layer.ts";

const EMBEDDER_WORKER = new URL("embedder-worker.test.support.ts", import.meta.url);
const WRONG_TOKEN = "wrong";
const FILLER = "0";
const TOKEN_LENGTH = 64;
const STALE_ENDPOINT = "{}";
const WORLD_READABLE = 0o644;
const OWNER_ONLY = 0o600;
const PERMISSION_RANGE = 0o1000;

const decodeEndpoint = Schema.decodeUnknownEffect(Schema.fromJsonString(ServerEndpoint));

const endpointPath = Effect.gen(function* endpointPath() {
  const path = yield* Path.Path;
  const { dataDirectory } = yield* Settings;
  return path.join(dataDirectory, ENDPOINT_FILE);
});

const endpointText = Effect.gen(function* endpointText() {
  const fileSystem = yield* FileSystem.FileSystem;
  const file = yield* endpointPath;
  return yield* fileSystem.readFileString(file);
});

const endpoint = endpointText.pipe(Effect.flatMap(decodeEndpoint));

const endpointPermissions = Effect.gen(function* endpointPermissions() {
  const fileSystem = yield* FileSystem.FileSystem;
  const file = yield* endpointPath;
  const { mode } = yield* fileSystem.stat(file);
  return mode % PERMISSION_RANGE;
});

const serverInTemporaryFolder = Layer.unwrap(
  Effect.gen(function* serverInTemporaryFolder() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dataDirectory = yield* fileSystem.makeTempDirectoryScoped();
    yield* fileSystem.writeFileString(path.join(dataDirectory, ENDPOINT_FILE), STALE_ENDPOINT, {
      mode: WORLD_READABLE,
    });
    const settings = Layer.succeed(Settings, {
      dataDirectory,
      modelDirectory: Option.none<string>(),
      embedderWorker: EMBEDDER_WORKER,
    });
    return serverLayer.pipe(Layer.provideMerge(settings));
  }),
).pipe(Layer.provideMerge(NodeServices.layer));

const serverUrlLayer = Layer.effect(
  ServerUrl,
  Effect.gen(function* serverUrl() {
    const context = yield* Effect.context<FileSystem.FileSystem | Path.Path | Settings>();
    return { url: awaitEndpoint(Effect.provideContext(endpointText, context)) };
  }),
);

const clientAndServer = aredokoClientLayer.pipe(
  Layer.provide(serverUrlLayer),
  Layer.provideMerge(serverInTemporaryFolder),
);

const opens = (url: string): Effect.Effect<boolean> =>
  Effect.callback((resume) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      socket.close();
      resume(Effect.succeed(true));
    });
    socket.addEventListener("error", () => {
      resume(Effect.succeed(false));
    });
    return Effect.sync(() => {
      socket.close();
    });
  });

const opensWith = Effect.fn("opensWith")(function* opensWith(query: string) {
  const { port } = yield* endpoint;
  return yield* opens(`ws://${HOST}:${port.toString()}/${query}`);
});

layer(clientAndServer, { excludeTestServices: true })("serverLayer", (it) => {
  it.effect("トークンを付けない接続を断る", () =>
    Effect.gen(function* refusesWithoutToken() {
      const opened = yield* opensWith("");
      expect(opened).toBe(false);
    }),
  );

  it.effect("違うトークンを付けた接続を断る", () =>
    Effect.gen(function* refusesWrongToken() {
      const opened = yield* opensWith(`?${TOKEN_PARAMETER}=${WRONG_TOKEN}`);
      expect(opened).toBe(false);
    }),
  );

  it.effect("長さが同じで中身の違うトークンを付けた接続を断る", () =>
    Effect.gen(function* refusesSameLengthToken() {
      const { token } = yield* endpoint;
      const forged = pipe(FILLER, String.repeat(token.length));
      expect(token).toHaveLength(TOKEN_LENGTH);
      expect(forged).not.toBe(token);
      const opened = yield* opensWith(`?${TOKEN_PARAMETER}=${forged}`);
      expect(opened).toBe(false);
    }),
  );

  it.effect("エンドポイントファイルのトークンを付けた接続を受け付ける", () =>
    Effect.gen(function* acceptsToken() {
      const { token } = yield* endpoint;
      const opened = yield* opensWith(`?${TOKEN_PARAMETER}=${token}`);
      expect(opened).toBe(true);
    }),
  );

  it.effect("エンドポイントファイルから作った URL でつないだクライアントの RPC が往復する", () =>
    Effect.gen(function* roundTrips() {
      const { GetStatus: getStatus } = yield* AredokoClient;
      const { version } = yield* getStatus();
      expect(version).toBe(VERSION);
    }),
  );

  it.effect("前回の起動で残ったエンドポイントファイルを持ち主だけが読めるものに置き換える", () =>
    Effect.gen(function* ownerOnly() {
      const permissions = yield* endpointPermissions;
      expect(permissions).toBe(OWNER_ONLY);
    }),
  );
});
