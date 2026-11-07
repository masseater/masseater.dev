import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Effect, Fiber, FileSystem, Option, Path, Stream, pipe } from "effect";

import { packageChanges } from "./package-changes.ts";

const SETTLE_MILLIS = 50;
const WATCHER_READY = "200 millis";
const WAIT = "2 seconds";
const QUIET = "500 millis";
const FIRST = 1;

const firstChange = Effect.fn("firstChange")(function* firstChange(root: string) {
  return yield* Stream.unwrap(packageChanges([root], SETTLE_MILLIS)).pipe(
    Stream.take(FIRST),
    Stream.runCollect,
    Effect.forkScoped,
  );
});

layer(NodeServices.layer, { excludeTestServices: true })("packageChanges", (it) => {
  it.effect("emits once a unitypackage lands in a watched folder", () =>
    Effect.gen(function* emitsOnPackage() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fileSystem.makeTempDirectoryScoped();
      const changes = yield* firstChange(root);
      yield* Effect.sleep(WATCHER_READY);
      yield* fileSystem.writeFileString(path.join(root, "notes.txt"), "ignored");
      yield* fileSystem.writeFileString(path.join(root, "Cabin.unitypackage"), "package");
      const result = yield* Fiber.join(changes).pipe(Effect.timeoutOption(WAIT));
      expect(
        pipe(
          result,
          Option.map((events) => events.length),
        ),
      ).toStrictEqual(Option.some(FIRST));
    }),
  );

  it.effect("ignores a download that has not finished", () =>
    Effect.gen(function* ignoresPartial() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fileSystem.makeTempDirectoryScoped();
      const changes = yield* firstChange(root);
      yield* Effect.sleep(WATCHER_READY);
      yield* fileSystem.writeFileString(path.join(root, "Cabin.unitypackage.crdownload"), "part");
      const result = yield* Fiber.join(changes).pipe(Effect.timeoutOption(QUIET));
      expect(Option.isNone(result)).toBe(true);
    }),
  );
});
