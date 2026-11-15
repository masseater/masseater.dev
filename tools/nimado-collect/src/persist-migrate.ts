#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Path } from "effect";

import { YOUTUBE_FILE } from "./state.ts";

const LEGACY = "../../.nimado-state";
const PERSIST = ".persist";
const YOUTUBE_DAYS = "data/days/youtube";

runMain("nimado-persist-migrate")(
  Effect.gen(function* persistMigrate() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const youtube = path.join(LEGACY, YOUTUBE_FILE);
    if (!(yield* fileSystem.exists(youtube))) {
      return yield* Effect.die(`${youtube} was not restored from the old cache`);
    }
    yield* fileSystem.makeDirectory(path.join(PERSIST, "data", "days"), { recursive: true });
    yield* fileSystem.rename(youtube, path.join(PERSIST, YOUTUBE_FILE));
    const days = path.join(LEGACY, YOUTUBE_DAYS);
    if (yield* fileSystem.exists(days)) {
      yield* fileSystem.rename(days, path.join(PERSIST, YOUTUBE_DAYS));
    }
  }),
);
