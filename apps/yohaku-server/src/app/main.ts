import { runMain } from "@masseater.dev/node-main";
import { MCP_PORT, SERVER_FLAGS } from "@masseater.dev/yohaku-protocol";
import { Duration, Effect, Layer, Option, Schedule, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import { agentLayer } from "#shared/agent";
import { Settings } from "#shared/settings";

import { appLayer, platformLayer } from "./server-layer.ts";

const VERSION = "0.1.0";
const PARENT_CHECK_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const SIGNAL_PROBE = 0;

const isAlive = (pid: number): boolean => {
  try {
    return globalThis.process.kill(pid, SIGNAL_PROBE);
  } catch {
    return false;
  }
};

const untilExits = (pid: number): Effect.Effect<void> =>
  Effect.sync(() => isAlive(pid)).pipe(
    Effect.repeat({ schedule: Schedule.spaced(PARENT_CHECK_INTERVAL), while: (alive) => alive }),
    Effect.asVoid,
  );

const command = Command.make(
  "yohaku-server",
  {
    dataDirectory: Flag.String(SERVER_FLAGS.dataDirectory),
    parentPid: Flag.String(SERVER_FLAGS.parentPid).pipe(Flag.optional),
  },
  ({ dataDirectory, parentPid }) => {
    const server = Layer.launch(
      appLayer.pipe(Layer.provide(agentLayer), Layer.provide(platformLayer)),
    ).pipe(Effect.provideService(Settings, { dataDirectory, mcpPort: MCP_PORT }));
    const parent = pipe(
      parentPid,
      Option.map((pid) => untilExits(globalThis.Number(pid))),
      Option.getOrElse(() => Effect.never),
    );
    return Effect.raceFirst(server, parent);
  },
);

runMain("yohaku-server")(Command.run(command, { version: VERSION }));
