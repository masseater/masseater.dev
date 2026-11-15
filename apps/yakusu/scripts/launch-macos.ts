import { Config, Effect, FileSystem, Path } from "effect";

import { capture, input, succeed } from "./launch-process.ts";
import { IDENTIFIER, LOG, OUTPUT, firstWith } from "./launch-target.ts";
import type { Target } from "./launch-target.ts";

const APP = "/Applications/yakusu.app";
const AGREE = "Y\n";

const install = Effect.fn("launch.macos.install")(function* install(installers: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dmg = yield* firstWith(installers, ".dmg");
  const mount = yield* fileSystem.makeTempDirectoryScoped();
  yield* succeed({
    file: "hdiutil",
    args: ["attach", dmg, "-nobrowse", "-readonly", "-mountpoint", mount],
    stdin: input(AGREE),
  });
  yield* succeed({ file: "cp", args: ["-R", path.join(mount, "yakusu.app"), "/Applications/"] });
  yield* succeed({ file: "hdiutil", args: ["detach", mount] });
});

const start = Effect.fn("launch.macos.start")(function* start(installers: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* install(installers);
  const gatekeeper = yield* capture({
    file: "spctl",
    args: ["--assess", "--type", "execute", "-vv", APP],
  });
  yield* fileSystem.writeFileString(path.join(OUTPUT, "gatekeeper.txt"), gatekeeper);
  yield* succeed({ file: "open", args: [APP] });
});

const log = Effect.gen(function* log() {
  const path = yield* Path.Path;
  const home = yield* Config.String("HOME");
  return path.join(home, "Library", "Logs", IDENTIFIER, LOG);
});

const macos: Target = {
  start,
  log,
  screenshot: (file) => Effect.asVoid(succeed({ file: "screencapture", args: ["-x", file] })),
  processes: capture({ file: "pgrep", args: ["-fl", "yakusu|llama-server"] }),
};

/** @internal */
export { macos };
