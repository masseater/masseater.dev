import { getJson, remove } from "@r_masseater/github-workflow";
import { Array as Arr, Console, Effect, Schema, pipe } from "effect";

import { sameKind, sameRun, staleOf } from "./stale-caches.ts";

const MAIN = "refs/heads/main";
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

type Entry = (typeof Caches.Type)["actions_caches"][number];

const megabytes = (bytes: number): string => `${String(Math.round(bytes / BYTES_PER_MEGABYTE))}MB`;

const removeCache = ({ id }: { readonly id: number }): ReturnType<typeof remove> =>
  remove(`actions/caches/${String(id)}`);

const onMain = (prefix: string): ReturnType<ReturnType<typeof getJson<typeof Caches>>> =>
  getJson(Caches)(
    `actions/caches?ref=${MAIN}&key=${encodeURIComponent(prefix)}&sort=created_at&direction=desc&per_page=100`,
  );

const TARGETS: readonly Readonly<{
  prefix: string;
  group: (entry: Entry) => string;
}>[] = [
  { prefix: "pnpm-store-Linux-X64-", group: sameKind },
  { prefix: "mise-v1-", group: sameKind },
  { prefix: "vite-task-", group: sameRun },
  { prefix: "msch-", group: sameRun },
  { prefix: "pnpm-metadata-", group: sameRun },
  { prefix: "persist-", group: sameRun },
];

const RETIRED = ["vite-plus-"];

const pruneOlder = Effect.fn("pruneOlder")(function* pruneOlder({
  prefix,
  group,
}: (typeof TARGETS)[number]) {
  const { actions_caches } = yield* onMain(prefix);
  yield* Effect.forEach(staleOf(actions_caches, group), removeCache, {
    concurrency: 1,
    discard: true,
  });
});

const pruneRetired = Effect.fn("pruneRetired")(function* pruneRetired(prefix: string) {
  const { actions_caches } = yield* onMain(prefix);
  yield* Effect.forEach(actions_caches, removeCache, { concurrency: 1, discard: true });
});

const pruneBranches = Effect.gen(function* pruneBranches() {
  const { actions_caches } = yield* getJson(Caches)("actions/caches?per_page=100");
  const branches = pipe(
    actions_caches,
    Arr.filter(({ ref }) => ref !== MAIN),
  );
  yield* Effect.forEach(branches, removeCache, { concurrency: 1, discard: true });
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
    { concurrency: 1, discard: true },
  );
});

/** @internal */
export const pruneCaches = Effect.forEach(TARGETS, pruneOlder, {
  concurrency: 1,
  discard: true,
}).pipe(
  Effect.andThen(Effect.forEach(RETIRED, pruneRetired, { concurrency: 1, discard: true })),
  Effect.andThen(pruneBranches),
  Effect.andThen(reportUsage),
);
