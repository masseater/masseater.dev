import { runMain } from "@masseater.dev/node-main";
import { Duration, Effect, FileSystem, Option, Path, Schedule, String as Str } from "effect";
import { Argument, Command } from "effect/cli";

import { linux } from "./lib/launch-linux.ts";
import { macos } from "./lib/launch-macos.ts";
import { LOG, OUTPUT } from "./lib/launch-target.ts";
import type { Target } from "./lib/launch-target.ts";
import { windows } from "./lib/launch-windows.ts";
import { platform } from "./lib/platform.ts";
import type { Platform } from "./lib/platform.ts";

const READY = "model loaded";
const POLL = Duration.fromInputUnsafe("5 seconds");
const TIMEOUT = Duration.fromInputUnsafe("10 minutes");
const SETTLE = Duration.fromInputUnsafe("5 seconds");

const TARGETS: Readonly<Record<Platform, Target>> = {
  "linux-x64": linux,
  "macos-arm64": macos,
  "windows-x64": windows,
};

const loaded = Effect.fn("launch.loaded")(function* loaded(log: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  if (!(yield* fileSystem.exists(log))) {
    return false;
  }
  const text = yield* fileSystem.readFileString(log);
  return Str.includes(READY)(text);
});

const waitForModel = (log: string): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  loaded(log).pipe(
    Effect.orElseSucceed(() => false),
    Effect.repeat({ schedule: Schedule.spaced(POLL), until: (ready) => ready }),
    Effect.timeoutOption(TIMEOUT),
    Effect.map(Option.isSome),
  );

const record = Effect.fn("launch.record")(function* record(chosen: Platform, log: string) {
  const target = TARGETS[chosen];
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.sleep(SETTLE);
  yield* target.screenshot(path.resolve(OUTPUT, "screen.png"));
  const processes = yield* target.processes;
  yield* Effect.log(processes);
  yield* fileSystem.writeFileString(path.join(OUTPUT, "processes.txt"), processes);
  if (yield* fileSystem.exists(log)) {
    yield* fileSystem.copyFile(log, path.join(OUTPUT, LOG));
  }
});

const launch = Effect.fn("launch.installed")(function* launch(
  chosen: Platform,
  installers: string,
) {
  const target = TARGETS[chosen];
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.makeDirectory(OUTPUT, { recursive: true });
  yield* target.start(installers);
  const log = yield* target.log;
  const ready = yield* waitForModel(log);
  yield* record(chosen, log);
  if (!ready) {
    return yield* Effect.die(
      `the installed app did not get llama-server to load the model within ${Duration.format(TIMEOUT)}`,
    );
  }
  return yield* Effect.log("the installed app started llama-server and it loaded the model");
});

const command = Command.make(
  "launch-installed",
  { target: platform, installers: Argument.Directory("installers") },
  ({ target, installers }) =>
    Effect.gen(function* installed() {
      const path = yield* Path.Path;
      yield* launch(target, path.resolve(installers));
    }).pipe(Effect.scoped),
);

runMain("yakusu-launch-installed")(Command.run(command, { version: "0.0.0" }));
