#!/usr/bin/env node
import { getJson, remove } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Schema, pipe } from "effect";

const PREFIXES = ["vite-plus-", "vite-task-"];
const NEWEST = 1;

const Caches = Schema.Struct({
  actions_caches: Schema.Array(Schema.Struct({ id: Schema.Int })),
});

const pruneOlder = Effect.fn("pruneOlder")(function* pruneOlder(prefix: string) {
  const { actions_caches } = yield* getJson(Caches)(
    `actions/caches?ref=refs/heads/main&key=${encodeURIComponent(prefix)}&sort=created_at&direction=desc&per_page=100`,
  );
  const older = pipe(actions_caches, Arr.drop(NEWEST));
  yield* Effect.forEach(older, ({ id }) => remove(`actions/caches/${String(id)}`), {
    discard: true,
  });
});

runMain("prune-caches")(Effect.forEach(PREFIXES, pruneOlder, { discard: true }));
