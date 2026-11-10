import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { env } from "@huggingface/transformers";
import { Array, Effect, FileSystem, Layer, Option, Record, Ref, String as Str, pipe } from "effect";

import { fetchModel, localEmbedderLayer } from "./embedder.ts";

const PINNED_COMMIT = /\/resolve\/[0-9a-f]{40}\//u;
const WEIGHTS = /\.onnx/u;
const NOT_FOUND = 404;
const PROCESSOR = { processor_class: "EmbeddingGemma2Processor" };
const SMALL_FILES: Readonly<Record<string, unknown>> = {
  "config.json": { model_type: "embedding_gemma2" },
  "preprocessor_config.json": PROCESSOR,
  "processor_config.json": PROCESSOR,
  "tokenizer_config.json": { tokenizer_class: "GemmaTokenizer", image_token: "<|image|>" },
  "tokenizer.json": {
    version: "1.0",
    added_tokens: [],
    normalizer: { type: "Lowercase" },
    pre_tokenizer: { type: "Whitespace" },
    post_processor: { type: "ByteLevel" },
    decoder: { type: "Fuse" },
    model: { type: "WordLevel", vocab: { "<unk>": 0 }, unk_token: "<unk>" },
  },
};

const respond = (url: string): Response =>
  pipe(
    url,
    Str.split("/"),
    Array.last,
    Option.flatMap((name) => Record.get(SMALL_FILES, name)),
    Option.match({
      onNone: () => new Response("", { status: NOT_FOUND }),
      onSome: (body) => Response.json(body),
    }),
  );

const unpinned = (url: string): boolean => !PINNED_COMMIT.test(url);

const namesWeights = (failure: string): boolean => WEIGHTS.test(failure);

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
  it.effect("sends every request to a pinned commit", () =>
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

  it.effect("loads the small files fetchModel stored without the network", () =>
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
      expect(pipe(failures, Array.map(namesWeights))).toStrictEqual([false, true]);
    }),
  );
});
