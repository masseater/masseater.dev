import { SERVER_FLAGS } from "@masseater.dev/aredoko-protocol";
import { runMain, whileParentAlive } from "@masseater.dev/node-main";
import { Effect, Layer, String, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import { Settings } from "#shared/settings";

import { VERSION } from "./rpc/handlers.ts";
import { serverLayer } from "./rpc/server-layer.ts";

const EMBEDDER_WORKER = new URL(
  pipe(import.meta.url, String.replace(/main(?<extension>\.\w+)$/u, "embedder-worker$<extension>")),
);
const command = Command.make(
  "aredoko-server",
  {
    dataDirectory: Flag.String(SERVER_FLAGS.dataDirectory),
    modelDirectory: Flag.String(SERVER_FLAGS.modelDirectory).pipe(Flag.optional),
    parentPid: Flag.String(SERVER_FLAGS.parentPid).pipe(Flag.optional),
  },
  ({ parentPid, ...settings }) => {
    const server = Layer.launch(serverLayer).pipe(
      Effect.provideService(Settings, { ...settings, embedderWorker: EMBEDDER_WORKER }),
    );
    return whileParentAlive(parentPid)(server);
  },
);

runMain("aredoko-server")(Command.run(command, { version: VERSION }));
