#!/usr/bin/env node
import {
  mustSucceed,
  outputOf,
  sha256Of,
  succeeds,
  warn,
  writeOutputs,
} from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Config, Duration, Effect, FileSystem, Option, Path, pipe } from "effect";

import { CACHE, MOSAIC, POOL, inRepository } from "./lib/repository.ts";

const STAGGER_SLOTS = 6;
const STAGGER_SECONDS = 30;
const SONGS_MINUTES = 180;
const POOLED = [
  "small",
  "target.png",
  "vocadb/songs.json",
  "vocadb/progress.json",
  "thumbs.json",
  "niconico-og.json",
];
const HASHED = ["vocadb/songs.json", "thumbs.json", "niconico-og.json"];
const STEPS = ["pool", "solve", "site"];

const unpack = Effect.fn("unpack")(function* unpack(slug: string) {
  const fs = yield* FileSystem.FileSystem;
  const pool = yield* inRepository(POOL);
  const cache = yield* inRepository(CACHE);
  const listed = yield* outputOf({ command: "tar", args: ["-tf", pool, "--", slug] }).pipe(
    Effect.option,
  );
  if (Option.isSome(listed)) {
    yield* mustSucceed({ command: "tar", args: ["-xf", pool, "-C", cache, "--", slug] });
  }
  yield* fs.remove(pool);
});

const existing = Effect.fn("existing")(function* existing(
  directory: string,
  names: readonly string[],
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* pipe(
    names,
    Effect.filter((name) => fs.exists(path.join(directory, name))),
  );
});

const keyOf = Effect.fn("keyOf")(function* keyOf(slug: string, directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const hashed = yield* existing(directory, HASHED);
  const contents = yield* pipe(
    hashed,
    Effect.forEach((name) => fs.readFile(path.join(directory, name))),
  );
  const digest = yield* sha256Of(contents);
  return `mosaic-pool-${slug}-${digest}`;
});

const pack = Effect.fn("pack")(function* pack(slug: string) {
  const path = yield* Path.Path;
  const cache = yield* inRepository(CACHE);
  const pool = yield* inRepository(POOL);
  const directory = path.join(cache, slug);
  const pooled = yield* existing(directory, POOLED);
  if (Arr.isReadonlyArrayNonEmpty(pooled)) {
    const members = pipe(
      pooled,
      Arr.map((name) => `${slug}/${name}`),
    );
    yield* mustSucceed({ command: "tar", args: ["-cf", pool, "-C", cache, "--", ...members] });
    const key = yield* keyOf(slug, directory);
    yield* writeOutputs({ key });
  }
});

const fetchSongs = Effect.fn("fetchSongs")(function* fetchSongs(mosaic: string, slug: string) {
  const fetched = yield* succeeds({ command: mosaic, args: ["songs", slug] }).pipe(
    Effect.timeoutOption(Duration.minutes(SONGS_MINUTES)),
    Effect.map(Option.getOrElse(() => false)),
  );
  if (!fetched) {
    yield* warn(
      `The songs of ${slug} were not all fetched, so the pool is built from what was fetched`,
    );
  }
});

const build = Effect.fn("build")(function* build(slug: string) {
  const mosaic = yield* inRepository(MOSAIC);
  const matched = yield* Config.String("MATCHED").pipe(Config.withDefault(""));
  const jobIndex = yield* Config.Int("JOB_INDEX");
  if (matched !== "") {
    yield* unpack(slug);
  }
  yield* Effect.sleep(Duration.seconds((jobIndex % STAGGER_SLOTS) * STAGGER_SECONDS));
  yield* fetchSongs(mosaic, slug);
  yield* Effect.forEach(STEPS, (step) => mustSucceed({ command: mosaic, args: [step, slug] }), {
    discard: true,
  });
});

const character = Effect.gen(function* character() {
  const slug = yield* Config.String("SLUG");
  yield* build(slug).pipe(Effect.ensuring(pack(slug).pipe(Effect.orDie)));
});

runMain("mosaic-character")(character);
