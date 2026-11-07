import { appLogDir, join } from "@tauri-apps/api/path";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Effect } from "effect";

const SERVER_LOG = "server.log";

const revealServerLog = (): Promise<void> =>
  Effect.runPromise(
    Effect.gen(function* revealServerLogFile() {
      const directory = yield* Effect.promise(appLogDir);
      const path = yield* Effect.promise(() => join(directory, SERVER_LOG));
      yield* Effect.promise(() => revealItemInDir(path));
    }),
  );

export { revealServerLog };
