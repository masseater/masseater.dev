import { Config, Duration, Effect, Option, Schedule } from "effect";
import type { Scope } from "effect";
import { HttpClient } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { DesktopApp } from "#/features/unleash-gremlins/model/tauri-config.ts";
import { passedEnv } from "#/shared/lib/process-env.ts";

const START_TIMEOUT_SECONDS = 180;
const POLL_SECONDS = 1;
const KILL_AFTER_SECONDS = 2;

const answers = Effect.fn("monkey.desktop.answers")(function* answers(url: string) {
  const client = yield* HttpClient.HttpClient;
  yield* client.get(url);
});

const waitUntilServing = (url: string): Effect.Effect<boolean, never, HttpClient.HttpClient> => {
  const poll = Schedule.spaced(Duration.seconds(POLL_SECONDS));
  const limit = Duration.seconds(START_TIMEOUT_SECONDS);
  return answers(url).pipe(
    Effect.retry(poll),
    Effect.timeoutOption(limit),
    Effect.map(Option.isSome),
    Effect.orElseSucceed(() => false),
  );
};

const started = Effect.fn("monkey.desktop.serve")(function* started(app: DesktopApp) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const env = yield* passedEnv;
  const home = yield* Config.String("HOME");
  yield* spawner.spawn(
    ChildProcess.make("sh", ["-c", `exec ${app.command}`], {
      cwd: app.dir,
      env: { ...env, HOME: home },
      extendEnv: false,
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
      forceKillAfter: Duration.seconds(KILL_AFTER_SECONDS),
    }),
  );
  return yield* waitUntilServing(app.url);
});

/** @internal */
export const serveDevServer = (
  app: DesktopApp,
): Effect.Effect<
  boolean,
  never,
  ChildProcessSpawner.ChildProcessSpawner | HttpClient.HttpClient | Scope.Scope
> => started(app).pipe(Effect.orElseSucceed(() => false));
