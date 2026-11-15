#!/usr/bin/env node
import { getJson, remove } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Console, Effect, Schema, pipe } from "effect";

const PREFIXES = ["vite-plus-", "vite-task-", "msch-"];
const NEWEST = 1;
const BYTES_PER_MEGABYTE = 1_048_576;

const Caches = Schema.Struct({
  actions_caches: Schema.Array(Schema.Struct({ id: Schema.Int })),
});

const Usage = Schema.Struct({
  active_caches_size_in_bytes: Schema.Int,
  active_caches_count: Schema.Int,
});

const Largest = Schema.Struct({
  actions_caches: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      ref: Schema.String,
      size_in_bytes: Schema.Int,
      last_accessed_at: Schema.String,
    }),
  ),
});

const megabytes = (bytes: number): string => `${String(Math.round(bytes / BYTES_PER_MEGABYTE))}MB`;

const pruneOlder = Effect.fn("pruneOlder")(function* pruneOlder(prefix: string) {
  const { actions_caches } = yield* getJson(Caches)(
    `actions/caches?ref=refs/heads/main&key=${encodeURIComponent(prefix)}&sort=created_at&direction=desc&per_page=100`,
  );
  const older = pipe(actions_caches, Arr.drop(NEWEST));
  yield* Effect.forEach(older, ({ id }) => remove(`actions/caches/${String(id)}`), {
    discard: true,
  });
});

const reportUsage = Effect.gen(function* reportUsage() {
  const usage = yield* getJson(Usage)("actions/cache/usage");
  yield* Console.log(
    `${String(usage.active_caches_count)} caches, ${megabytes(usage.active_caches_size_in_bytes)}`,
  );
  const { actions_caches } = yield* getJson(Largest)(
    "actions/caches?sort=size_in_bytes&direction=desc&per_page=20",
  );
  yield* Effect.forEach(
    actions_caches,
    ({ key, ref, size_in_bytes, last_accessed_at }) =>
      Console.log(`${megabytes(size_in_bytes)} ${ref} ${key} ${last_accessed_at}`),
    { discard: true },
  );
});

runMain("prune-caches")(
  Effect.forEach(PREFIXES, pruneOlder, { discard: true }).pipe(Effect.andThen(reportUsage)),
);
