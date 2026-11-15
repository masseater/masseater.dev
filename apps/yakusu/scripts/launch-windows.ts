import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";

import { capture, succeed } from "./launch-process.ts";
import { IDENTIFIER, LOG, firstWith } from "./launch-target.ts";
import type { Target } from "./launch-target.ts";

const EXECUTABLE = "yakusu.exe";
const PROCESS = /yakusu|llama-server/iu;

const powershell = (script: string): ReturnType<typeof succeed> =>
  succeed({ file: "powershell", args: ["-NoProfile", "-Command", script] });

const installed = Effect.fn("launch.windows.installed")(function* installed(localAppData: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(localAppData);
  const candidates = pipe(
    names,
    Arr.map((name) => path.join(localAppData, name, EXECUTABLE)),
  );
  const found = yield* Effect.findFirst(candidates, (file) => fileSystem.exists(file));
  if (Option.isNone(found)) {
    return yield* Effect.die(`the installer did not put ${EXECUTABLE} under ${localAppData}`);
  }
  return found.value;
});

const start = Effect.fn("launch.windows.start")(function* start(installers: string) {
  const localAppData = yield* Config.String("LOCALAPPDATA");
  const path = yield* Path.Path;
  const installer = yield* firstWith(path.join(installers, "nsis"), ".exe");
  yield* succeed({ file: installer, args: ["/S"] });
  const app = yield* installed(localAppData);
  yield* powershell(`Start-Process -FilePath '${app}'`);
});

const log = Effect.gen(function* log() {
  const path = yield* Path.Path;
  const localAppData = yield* Config.String("LOCALAPPDATA");
  return path.join(localAppData, IDENTIFIER, "logs", LOG);
});

const screenshot = (file: string): ReturnType<typeof powershell> =>
  powershell(
    Arr.join(
      [
        "Add-Type -AssemblyName System.Windows.Forms,System.Drawing",
        "$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds",
        "$i=New-Object System.Drawing.Bitmap $b.Width,$b.Height",
        "[System.Drawing.Graphics]::FromImage($i).CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size)",
        `$i.Save('${file}')`,
      ],
      "; ",
    ),
  );

const processes = Effect.map(capture({ file: "tasklist", args: [] }), (listed) =>
  pipe(
    Str.split(listed, "\n"),
    Arr.filter((line) => PROCESS.test(line)),
    Arr.join("\n"),
  ),
);

/** @internal */
export const windows: Target = {
  start,
  log,
  screenshot: (file) => Effect.asVoid(screenshot(file)),
  processes,
};
