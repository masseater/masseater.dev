import { runMain, whileParentAlive } from "@masseater.dev/node-main";
import { MCP_PORT, SERVER_FLAGS } from "@masseater.dev/yohaku-protocol";
import { Effect, Layer } from "effect";
import { Command, Flag } from "effect/cli";

import { agentLayer } from "#shared/agent";
import { Settings } from "#shared/settings";

import { appLayer, platformLayer } from "./server-layer.ts";

const VERSION = "0.1.0";

const command = Command.make(
  "yohaku-server",
  {
    dataDirectory: Flag.String(SERVER_FLAGS.dataDirectory),
    parentPid: Flag.String(SERVER_FLAGS.parentPid).pipe(Flag.optional),
    claude: Flag.String(SERVER_FLAGS.claude).pipe(Flag.optional),
  },
  ({ dataDirectory, parentPid, claude }) => {
    const agent = agentLayer(claude);
    const server = Layer.launch(
      appLayer.pipe(Layer.provide(agent), Layer.provide(platformLayer)),
    ).pipe(Effect.provideService(Settings, { dataDirectory, mcpPort: MCP_PORT }));
    return whileParentAlive(parentPid)(server);
  },
);

runMain("yohaku-server")(Command.run(command, { version: VERSION }));
