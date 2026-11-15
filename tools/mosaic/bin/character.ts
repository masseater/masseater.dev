#!/usr/bin/env node
import { mustSucceed, succeeds, warn } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Config, Duration, Effect, FileSystem, Option, Path, pipe } from "effect";

import { CACHE, MOSAIC, PERSIST, inRepository } from "./repository.ts";

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
const STEPS = ["pool", "solve", "site"];
const FIRST_JOB = 0;

const copied = Effect.fn("copied")(function* copied(from: string, to: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.forEach(
    POOLED,
    (name) =>
      Effect.gen(function* entry() {
        const source = path.join(from, name);
        const present = yield* fs.exists(source);
        if (present) {
          const target = path.join(to, name);
          yield* fs.makeDirectory(path.dirname(target), { recursive: true });
          yield* fs.copy(source, target, { overwrite: true });
        }
      }),
    { discard: true },
  );
});

const directoriesOf = Effect.fn("directoriesOf")(function* directoriesOf(slug: string) {
  const path = yield* Path.Path;
  const cache = yield* inRepository(CACHE);
  const persist = yield* inRepository(PERSIST);
  return { cache: path.join(cache, slug), persist: path.join(persist, slug) };
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
  const jobIndex = yield* Config.Int("JOB_INDEX").pipe(Config.withDefault(FIRST_JOB));
  yield* Effect.sleep(Duration.seconds((jobIndex % STAGGER_SLOTS) * STAGGER_SECONDS));
  yield* fetchSongs(mosaic, slug);
  yield* Effect.forEach(STEPS, (step) => mustSucceed({ command: mosaic, args: [step, slug] }), {
    discard: true,
  });
});

const character = Effect.gen(function* character() {
  const slug = yield* Config.String("ITEM");
  const { cache, persist } = yield* directoriesOf(slug);
  yield* copied(persist, cache);
  yield* pipe(build(slug), Effect.ensuring(copied(cache, persist).pipe(Effect.orDie)));
});

runMain("mosaic-character")(character);
