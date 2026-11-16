#!/usr/bin/env node
import { warn } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { CHARACTERS, manifestPath, slugPath } from "@thumb-mosaic/mosaic";
import { Effect, FileSystem, Option, Path, Schedule, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { BASE_PATH } from "#/shared/config/index.ts";

const ORIGIN = `https://masseater.dev${BASE_PATH}`;
const RETRIES = 3;
const PUBLISHED = "../public";

const Manifest = Schema.fromJsonString(Schema.Struct({ candidates: Schema.String }));

const fetched = Effect.fn("fetched")(function* fetched(file: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(`${ORIGIN}/${file}`);
  const ok = yield* HttpClientResponse.filterStatusOk(response);
  const text = yield* ok.text;
  return text;
});

const retried = (
  file: string,
): Effect.Effect<string, Effect.Error<ReturnType<typeof fetched>>, HttpClient.HttpClient> =>
  fetched(file).pipe(Effect.retry(Schedule.recurs(RETRIES)));

const published = Effect.fn("published")(function* published(file: string, text: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(import.meta.dirname, PUBLISHED);
  const target = path.join(root, file);
  yield* fs.makeDirectory(path.dirname(target), { recursive: true });
  yield* fs.writeFileString(target, text);
});

const withCandidates = Effect.fn("withCandidates")(function* withCandidates(
  slug: string,
  manifest: string,
) {
  yield* published(manifestPath(slug), manifest);
  const { candidates } = yield* Schema.decodeEffect(Manifest)(manifest);
  const file = `${slugPath(slug)}/${candidates}`;
  const text = yield* retried(file);
  yield* published(file, text);
});

const prerendered = Effect.fn("prerendered")(function* prerendered(slug: string) {
  const manifest = yield* retried(manifestPath(slug)).pipe(Effect.option);
  yield* Option.match(manifest, {
    onNone: () => warn(`${slug} has no published manifest, so its page is not prerendered`),
    onSome: (text) => withCandidates(slug, text),
  });
});

const live = Effect.forEach(CHARACTERS, ({ slug }) => prerendered(slug), { discard: true });

runMain("mosaic-live")(live);
