import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { ConfigProvider, Duration, Effect, FileSystem, Path } from "effect";
import type { Config, PlatformError, Scope } from "effect";
import type { ChildProcessSpawner } from "effect/process";
import { expect, it } from "vite-plus/test";

import { snapshotAfter } from "./snapshot.ts";

const NO_WAIT = Duration.fromInputUnsafe("1 millis");

const run = (
  effect: Effect.Effect<
    void,
    Config.ConfigError | PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path | Scope.Scope
  >,
): Promise<void> => Effect.runPromise(effect.pipe(Effect.scoped, Effect.provide(nodeServices)));

it("writes the processes and the sockets of the runner to the deploy-hang directory", () =>
  run(
    Effect.gen(function* written() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const temporary = yield* fileSystem.makeTempDirectoryScoped();
      const environment = ConfigProvider.fromUnknown({ RUNNER_TEMP: temporary });
      yield* snapshotAfter("portfolio", NO_WAIT).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, environment),
      );
      const report = yield* fileSystem.readFileString(
        path.join(temporary, "deploy-hang", "portfolio.txt"),
      );
      expect(report).toContain("portfolio has not finished after");
      expect(report).toContain("== processes");
      expect(report).toContain("== sockets");
    }),
  ));
