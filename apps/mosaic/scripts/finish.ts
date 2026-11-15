#!/usr/bin/env node
import { getJson, remove, writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Config, Effect, FileSystem, Path, Schema, pipe } from "effect";

import { CACHE, PUBLISHED, inRepository } from "./repository.ts";

const SAVED = "success";
const FIRST_VARIANT = "0";

const Cache = Schema.Struct({ key: Schema.String });

const Caches = Schema.Struct({ actions_caches: Schema.Array(Cache) });

const isStalePool = (slug: string, keep: string): ((key: string) => boolean) => {
  const pool = new RegExp(`^mosaic-pool-${slug}-[0-9a-f]{64}$`, "u");
  return (key) => pool.test(key) && key !== keep;
};

const pruneOlderPools = Effect.fn("pruneOlderPools")(function* pruneOlderPools(slug: string) {
  const keep = yield* Config.String("KEEP");
  const prefix = encodeURIComponent(`mosaic-pool-${slug}-`);
  const { actions_caches } = yield* getJson(Caches)(`actions/caches?per_page=100&key=${prefix}`);
  const stale = pipe(
    actions_caches,
    Arr.map(({ key }) => key),
    Arr.filter(isStalePool(slug, keep)),
  );
  yield* Effect.forEach(stale, (key) => remove(`actions/caches?key=${encodeURIComponent(key)}`), {
    discard: true,
  });
});

const markChanged = Effect.fn("markChanged")(function* markChanged(slug: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* inRepository(PUBLISHED);
  const built = yield* fs.exists(path.join(root, "files", slug, FIRST_VARIANT));
  if (built) {
    yield* writeOutputs({ changed: "true" });
  }
});

const finish = Effect.gen(function* finish() {
  const fs = yield* FileSystem.FileSystem;
  const slug = yield* Config.String("SLUG");
  const saved = yield* Config.String("SAVED").pipe(Config.withDefault(""));
  if (saved === SAVED) {
    yield* pruneOlderPools(slug);
  }
  const cache = yield* inRepository(CACHE);
  yield* fs.remove(cache, { recursive: true, force: true });
  yield* markChanged(slug);
});

runMain("mosaic-finish")(finish);
