import { Clock, Effect, FileSystem, Option, Path, String as Str } from "effect";
import type { PlatformError, Scope } from "effect";

const STALE_LOCK_MILLIS = 600_000;

const safe = Str.replaceAll(/[^\w.-]/gu, "_");

const made = (directory: string): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  Effect.service(FileSystem.FileSystem).pipe(
    Effect.flatMap((fs) => fs.makeDirectory(directory)),
    Effect.as(true),
    Effect.orElseSucceed(() => false),
  );

const isStale = (directory: string): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  Effect.gen(function* stale() {
    const fs = yield* FileSystem.FileSystem;
    const info = yield* Effect.option(fs.stat(directory));
    const now = yield* Clock.currentTimeMillis;
    return Option.exists(
      info.pipe(Option.flatMap((stat) => stat.mtime)),
      (time) => now - time.getTime() >= STALE_LOCK_MILLIS,
    );
  });

const claim = (directory: string): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  Effect.gen(function* tryClaim() {
    const fs = yield* FileSystem.FileSystem;
    if (yield* made(directory)) {
      return true;
    }
    if (!(yield* isStale(directory))) {
      return false;
    }
    yield* Effect.ignore(fs.remove(directory, { recursive: true }));
    return yield* made(directory);
  });

const lock = (
  held: Readonly<{ home: string; name: string }>,
): Effect.Effect<
  boolean,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path | Scope.Scope
> =>
  Effect.gen(function* acquire() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = path.join(held.home, "locks", safe(held.name));
    yield* fs.makeDirectory(path.dirname(directory), { recursive: true });
    return yield* Effect.acquireRelease(claim(directory), (claimed) =>
      Effect.when(
        Effect.ignore(fs.remove(directory, { recursive: true })),
        Effect.succeed(claimed),
      ),
    );
  });

/** @internal */
export { lock };
