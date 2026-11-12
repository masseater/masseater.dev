import { Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

type Launch = readonly [string, readonly string[]];

const launchOf = (url: string): Launch => {
  if (process.platform === "darwin") {
    return ["open", [url]];
  }
  if (process.platform === "win32") {
    return ["rundll32", ["url.dll,FileProtocolHandler", url]];
  }
  return ["xdg-open", [url]];
};

const openBrowser = (
  url: string,
): Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* launch() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const [file, args] = launchOf(url);
    yield* spawner.exitCode(ChildProcess.make(file, args, { stdin: "ignore" }));
  }).pipe(Effect.ignore);

/** @internal */
export { openBrowser };
