import { AredokoClient, SERVER_FLAGS } from "@masseater.dev/aredoko-protocol";
import { Duration, Effect, Schedule } from "effect";
import { ChildProcess } from "effect/process";

const SERVER_ENTRY = "../../apps/aredoko-server/src/app/main.ts";
const READY_INTERVAL = Duration.fromInputUnsafe("1 second");
const READY_ATTEMPTS = 120;

/** @internal */
const startServer = Effect.fn("startServer")(function* startServer(dataDirectory: string) {
  yield* ChildProcess.make(
    globalThis.process.execPath,
    [SERVER_ENTRY, `--${SERVER_FLAGS.dataDirectory}`, dataDirectory],
    { stdout: "ignore", stderr: "inherit" },
  );
  const { GetStatus: getStatus } = yield* AredokoClient;
  yield* getStatus().pipe(
    Effect.retry({ schedule: Schedule.spaced(READY_INTERVAL), times: READY_ATTEMPTS }),
  );
});

export { startServer };
