import { SERVER_FLAGS } from "@masseater.dev/aredoko-protocol";
import { runMain } from "@masseater.dev/aredoko-runtime";
import { Duration, Effect, Layer, Option, Schedule, String, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import { Settings } from "#shared/settings";

import { VERSION } from "./rpc/handlers.ts";
import { serverLayer } from "./rpc/server-layer.ts";

const EMBEDDER_WORKER = new URL(
  pipe(import.meta.url, String.replace(/main(?<extension>\.\w+)$/u, "embedder-worker$<extension>")),
);
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
    const parent = pipe(
      parentPid,
      Option.map((pid) => untilExits(globalThis.Number(pid))),
      Option.getOrElse(() => Effect.never),
    );
    return Effect.raceFirst(server, parent);
  },
);

runMain("aredoko-server")(Command.run(command, { version: VERSION }));
