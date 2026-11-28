import { finished } from "@r_masseater/github-workflow";
import { Config, Console, Duration, Effect, FileSystem, Path } from "effect";

const PROCESSES = {
  command: "ps",
  args: ["-eo", "pid,ppid,etimes,stat,pcpu,wchan:32,args", "--forest", "--width", "300"],
};
const SOCKETS = { command: "ss", args: ["-tnp"] };

const section = (title: string, { output }: Readonly<{ output: string }>): string =>
  `== ${title}\n${output}`;

/** @internal */
export const snapshotAfter = Effect.fn("snapshotAfter")(function* snapshotAfter(
  stack: string,
  wait: Duration.Duration,
) {
  yield* Effect.sleep(wait);
  const [processes, sockets] = yield* Effect.all([finished(PROCESSES), finished(SOCKETS)]);
  const report = `${stack} has not finished after ${Duration.format(wait)}\n${section("processes", processes)}\n${section("sockets", sockets)}`;
  yield* Console.error(`::group::${stack} is still running\n${report}\n::endgroup::`);
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = path.join(yield* Config.String("RUNNER_TEMP"), "deploy-hang");
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  yield* fileSystem.writeFileString(path.join(directory, `${stack}.txt`), report);
}, Effect.ignore);
