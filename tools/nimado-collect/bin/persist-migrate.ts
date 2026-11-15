#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Path } from "effect";

import { YOUTUBE_FILE } from "#/entities/catalog/index.ts";

const LEGACY = "../../.nimado-state";
const PERSIST = ".persist";
const YOUTUBE_DAYS = "data/days/youtube";

const restored = Effect.fn("restored")(function* restored(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const exists = yield* fileSystem.exists(file);
  if (!exists) {
    return yield* Effect.die(`${file} was not restored from the old cache`);
  }
  return file;
});

const movedIfPresent = Effect.fn("movedIfPresent")(function* movedIfPresent(
  from: string,
  to: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const exists = yield* fileSystem.exists(from);
  if (exists) {
    yield* fileSystem.rename(from, to);
  }
});

runMain("nimado-persist-migrate")(
  Effect.gen(function* persistMigrate() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const youtube = yield* restored(path.join(LEGACY, YOUTUBE_FILE));
    yield* fileSystem.makeDirectory(path.join(PERSIST, "data", "days"), { recursive: true });
    yield* fileSystem.rename(youtube, path.join(PERSIST, YOUTUBE_FILE));
    yield* movedIfPresent(path.join(LEGACY, YOUTUBE_DAYS), path.join(PERSIST, YOUTUBE_DAYS));
  }),
);
