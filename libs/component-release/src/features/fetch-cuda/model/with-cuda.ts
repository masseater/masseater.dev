import { Array as Arr, Effect, Path } from "effect";
import type { Option } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { CommandFailed, repositoryRoot } from "#/shared/lib/command.ts";

import { environmentOf } from "./host.ts";
import { platformOf } from "./platform.ts";
import type { Platform } from "./platform.ts";
import { toolkitOf, writeRuntime } from "./toolkit.ts";

const SUCCESS = 0;

/** @internal */
export interface WithCuda {
  readonly version: string;
  readonly computeCap: string;
  readonly msvc: Option.Option<string>;
  readonly runtime: Option.Option<string>;
  readonly command: readonly string[];
}

const prepared = Effect.fn("cuda.prepare")(function* prepared(
  platform: Platform,
  { version, computeCap, msvc, runtime }: WithCuda,
) {
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  const directory = path.join(root, "target", "cuda", version);
  const { toolkit, manifest } = yield* toolkitOf({ platform, directory }, version);
  yield* writeRuntime({ platform, toolkit, manifest }, runtime);
  return yield* environmentOf({ platform, toolkit, computeCap, msvc });
});

/** @internal */
export const withCuda = Effect.fn("cuda.with")(function* withCuda(request: WithCuda) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const platform = yield* platformOf(process.platform);
  const { env, complete } = yield* prepared(platform, request);
  const line = Arr.join(request.command, " ");
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(line, [], {
      env,
      extendEnv: !complete,
      shell: true,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  if (exitCode !== SUCCESS) {
    return yield* CommandFailed.make({ command: line, exitCode });
  }
  return exitCode;
});
