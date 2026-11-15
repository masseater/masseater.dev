import { Config, Duration, Effect, Path } from "effect";

import { background, capture, succeed } from "./launch-process.ts";
import { IDENTIFIER, LOG, firstWith } from "./launch-target.ts";
import type { Target } from "./launch-target.ts";

const DISPLAY = ":99";
const SCREEN = "1280x800x24";
const XVFB_START = Duration.fromInputUnsafe("2 seconds");
const ENV = { DISPLAY };

const start = Effect.fn("launch.linux.start")(function* start(installers: string) {
  const path = yield* Path.Path;
  const deb = yield* firstWith(path.join(installers, "deb"), ".deb");
  yield* succeed({
    file: "sudo",
    args: ["apt-get", "install", "-y", deb, "xvfb", "imagemagick"],
  });
  yield* background({ file: "Xvfb", args: [DISPLAY, "-screen", "0", SCREEN] });
  yield* Effect.sleep(XVFB_START);
  yield* background({ file: "yakusu", args: [], env: ENV });
});

const log = Effect.gen(function* log() {
  const path = yield* Path.Path;
  const home = yield* Config.String("HOME");
  return path.join(home, ".local", "share", IDENTIFIER, "logs", LOG);
});

/** @internal */
export const linux: Target = {
  start,
  log,
  screenshot: (file) =>
    Effect.asVoid(succeed({ file: "import", args: ["-window", "root", file], env: ENV })),
  processes: capture({ file: "pgrep", args: ["-fa", "yakusu|llama-server"] }),
};
