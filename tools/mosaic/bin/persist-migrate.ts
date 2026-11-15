#!/usr/bin/env node
import { mustSucceed } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Path } from "effect";

import { CACHE, PERSIST, inRepository } from "./lib/repository.ts";

const POOL = "pool.tar";

const migrate = Effect.gen(function* migrate() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cache = yield* inRepository(CACHE);
  const persist = yield* inRepository(PERSIST);
  yield* fs.makeDirectory(persist, { recursive: true });
  yield* mustSucceed({ command: "tar", args: ["-xf", path.join(cache, POOL), "-C", persist] });
});

runMain("mosaic-persist-migrate")(migrate);
