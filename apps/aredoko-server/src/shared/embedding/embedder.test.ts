import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { env } from "@huggingface/transformers";
import { Array, Effect, FileSystem, Layer, Option, Ref, String as Str, pipe } from "effect";

import { fetchModel, localEmbedderLayer } from "./embedder.ts";

const PINNED_COMMIT = /\/resolve\/[0-9a-f]{40}\//u;
const MODEL_CONFIG_PATH = /[/\\]config\.json/u;
const NOT_FOUND = 404;

const respond = (url: string): Response => {
  if (pipe(url, Str.endsWith("/config.json"))) {
    return Response.json({ model_type: "fake" });
  }
  return new Response("", { status: NOT_FOUND });
};

const unpinned = (url: string): boolean => !PINNED_COMMIT.test(url);

const namesModelConfig = (failure: string): boolean => MODEL_CONFIG_PATH.test(failure);

const replaceFetch = (fetch: typeof env.fetch): Effect.Effect<void> =>
  Effect.sync(() => {
    Object.assign(env, { fetch });
  });

const recordFetches = Effect.gen(function* recordFetches() {
  const requested = yield* Ref.make<readonly string[]>([]);
  const context = yield* Effect.context();
  const run = Effect.runPromiseWith(context);
  const original = env.fetch;
  const record = (url: string): Effect.Effect<Response> =>
    Ref.update(requested, Array.append(url)).pipe(Effect.as(respond(url)));
  const fetch: typeof env.fetch = (input) => run(record(String(input)));
  yield* Effect.acquireRelease(replaceFetch(fetch), () => replaceFetch(original));
  return requested;
});

const loadFailure = Effect.fn("loadFailure")(function* loadFailure(directory: string) {
  const failure = yield* Layer.build(localEmbedderLayer(Option.some(directory))).pipe(
    Effect.scoped,
    Effect.flip,
  );
  return String(failure.cause);
});

layer(NodeServices.layer, { excludeTestServices: true })("embedder", (it) => {
  it.effect("downloads every model file from a pinned commit", () =>
    Effect.gen(function* downloadsPinned() {
      const fileSystem = yield* FileSystem.FileSystem;
      const directory = yield* fileSystem.makeTempDirectoryScoped();
      const requested = yield* recordFetches;
      yield* fetchModel(directory).pipe(Effect.flip);
      const urls = yield* Ref.get(requested);
      expect(urls).not.toStrictEqual([]);
      expect(pipe(urls, Array.filter(unpinned))).toStrictEqual([]);
    }),
  );

  it.effect("loads the files fetchModel stored without the network", () =>
    Effect.gen(function* loadsStored() {
      const fileSystem = yield* FileSystem.FileSystem;
      const fetched = yield* fileSystem.makeTempDirectoryScoped();
      const empty = yield* fileSystem.makeTempDirectoryScoped();
      const requested = yield* recordFetches;
      yield* fetchModel(fetched).pipe(Effect.flip);
      const duringFetch = yield* Ref.get(requested);
      const failures = yield* Effect.forEach([empty, fetched], loadFailure);
      const afterLoad = yield* Ref.get(requested);
      expect(afterLoad).toStrictEqual(duringFetch);
      expect(pipe(failures, Array.map(namesModelConfig))).toStrictEqual([true, false]);
    }),
  );
});
