#!/usr/bin/env node
import { getJson, remove } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Console, Effect, Schema, String as Str, pipe } from "effect";

const MAIN = "refs/heads/main";
const PREFIXES = ["vite-plus-", "vite-task-", "msch-"];
const NEWEST = 1;
const BYTES_PER_MEGABYTE = 1_048_576;

const Caches = Schema.Struct({
  actions_caches: Schema.Array(
    Schema.Struct({
      id: Schema.Int,
      key: Schema.String,
      ref: Schema.String,
      size_in_bytes: Schema.Int,
      last_accessed_at: Schema.String,
    }),
  ),
});

const Usage = Schema.Struct({
  active_caches_size_in_bytes: Schema.Int,
  active_caches_count: Schema.Int,
});

const megabytes = (bytes: number): string => `${String(Math.round(bytes / BYTES_PER_MEGABYTE))}MB`;

const removeCache = ({ id }: { readonly id: number }): ReturnType<typeof remove> =>
  remove(`actions/caches/${String(id)}`);

const pruneOlder = Effect.fn("pruneOlder")(function* pruneOlder(prefix: string) {
  const { actions_caches } = yield* getJson(Caches)(
    `actions/caches?ref=${MAIN}&key=${encodeURIComponent(prefix)}&sort=created_at&direction=desc&per_page=100`,
  );
  yield* Effect.forEach(pipe(actions_caches, Arr.drop(NEWEST)), removeCache, { discard: true });
});

const PERSIST = "persist-";
const RUN_SUFFIX = /-\d+$/u;

const prunePersisted = Effect.gen(function* prunePersisted() {
  const { actions_caches } = yield* getJson(Caches)(
    `actions/caches?ref=${MAIN}&key=${PERSIST}&sort=created_at&direction=desc&per_page=100`,
  );
  const groupOf = ({ key }: { readonly key: string }): string => Str.replace(RUN_SUFFIX, "")(key);
  const older = pipe(
    actions_caches,
    Arr.filter((cache, index) =>
      pipe(
        actions_caches,
        Arr.take(index),
        Arr.some((newer) => groupOf(newer) === groupOf(cache)),
      ),
    ),
  );
  yield* Effect.forEach(older, removeCache, { discard: true });
});

const pruneBranches = Effect.gen(function* pruneBranches() {
  const { actions_caches } = yield* getJson(Caches)("actions/caches?per_page=100");
  const branches = pipe(
    actions_caches,
    Arr.filter(({ ref }) => ref !== MAIN),
  );
  yield* Effect.forEach(branches, removeCache, { discard: true });
});

const reportUsage = Effect.gen(function* reportUsage() {
  const usage = yield* getJson(Usage)("actions/cache/usage");
  yield* Console.log(
    `${String(usage.active_caches_count)} caches, ${megabytes(usage.active_caches_size_in_bytes)}`,
  );
  const { actions_caches } = yield* getJson(Caches)(
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
  Effect.forEach(PREFIXES, pruneOlder, { discard: true }).pipe(
    Effect.andThen(prunePersisted),
    Effect.andThen(pruneBranches),
    Effect.andThen(reportUsage),
  ),
);
