import type { DeviceType, PretrainedConfig } from "@huggingface/transformers";
import {
  AutoConfig,
  AutoModel,
  AutoProcessor,
  RawImage,
  Tensor,
  env,
} from "@huggingface/transformers";
import { Array, Context, Effect, Layer, Option, Predicate, Schema, pipe } from "effect";

import { EmbeddingFailed } from "./embedding-failed.ts";

const MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
const MODEL_REVISION = "daa72c51243991dfcaf9f9137d2c573d8f7790c0";
const PINNED_REMOTE_PATH = `{model}/resolve/${MODEL_REVISION}/`;
const REVISION_CACHE = pipe(
  Option.fromNullOr(env.cacheDir),
  Option.map((shared) => `${shared}/${MODEL_REVISION}`),
  Option.getOrNull,
);
const DTYPE = "q4";
const DEVICES = ["dml", "cpu"] as const satisfies readonly DeviceType[];
const IMAGE_SOFT_TOKENS = 70;

type Vector = readonly number[];

type Model = Awaited<ReturnType<typeof AutoModel.from_pretrained>>;

type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;

class Embedder extends Context.Service<
  Embedder,
  {
    readonly device: string;
    readonly embedQuery: (query: string) => Effect.Effect<Vector, EmbeddingFailed>;
    readonly embedDocuments: (
      texts: readonly string[],
    ) => Effect.Effect<readonly Vector[], EmbeddingFailed>;
    readonly embedImages: (
      pngs: readonly Uint8Array[],
    ) => Effect.Effect<readonly Vector[], EmbeddingFailed>;
  }
>()("aredoko-server/shared/embedding/embedder") {}

const failed = (cause: unknown): EmbeddingFailed => EmbeddingFailed.make({ cause });

const attempt = <Value>(evaluate: () => Promise<Value>): Effect.Effect<Value, EmbeddingFailed> =>
  Effect.tryPromise({ try: evaluate, catch: failed });

const decodeOutput = Schema.decodeUnknownEffect(
  Schema.Struct({ sentence_embedding: Schema.instanceOf(Tensor) }),
);

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(Schema.Array(Schema.Finite)));

const decodeImageToken = Schema.decodeUnknownEffect(Schema.String);

const queryPrompt = (query: string): string => `task: search result | query: ${query}`;

const documentPrompt = (text: string): string => `title: none | text: ${text}`;

const FETCH_DEVICE = "cpu";

const preferLocalModels = (directory: string): void => {
  Object.assign(env, {
    localModelPath: directory,
    allowLocalModels: true,
    allowRemoteModels: false,
    useFSCache: false,
  });
};

const downloadPinned = (): void => {
  Object.assign(env, { cacheDir: REVISION_CACHE, remotePathTemplate: PINNED_REMOTE_PATH });
};

const loadModel = (
  config: PretrainedConfig,
): Effect.Effect<{ readonly model: Model; readonly device: string }, EmbeddingFailed> =>
  Effect.firstSuccessOf(
    pipe(
      DEVICES,
      Array.map((device) =>
        attempt(() => AutoModel.from_pretrained(MODEL_ID, { config, device, dtype: DTYPE })).pipe(
          Effect.map((model) => ({ model, device })),
        ),
      ),
    ),
  );

const loadProcessor = Effect.gen(function* loadProcessor() {
  const processor = yield* attempt(() => AutoProcessor.from_pretrained(MODEL_ID));
  const imageProcessor: unknown = Reflect.get(processor, "image_processor");
  if (Predicate.isObjectKeyword(imageProcessor)) {
    Reflect.set(imageProcessor, "max_soft_tokens", IMAGE_SOFT_TOKENS);
  }
  const imageToken = yield* decodeImageToken(Reflect.get(processor, "image_token")).pipe(
    Effect.mapError(failed),
  );
  return { processor, imageToken };
});

const embedWith =
  (model: Model) =>
  (prepare: () => Promise<unknown>): Effect.Effect<readonly Vector[], EmbeddingFailed> =>
    Effect.gen(function* embed() {
      const inputs = yield* attempt(prepare);
      const output = yield* attempt(() => Promise.resolve<unknown>(model(inputs)));
      const { sentence_embedding: embedding } = yield* decodeOutput(output).pipe(
        Effect.mapError(failed),
      );
      return yield* decodeRows(embedding.tolist()).pipe(Effect.mapError(failed));
    }).pipe(Effect.withSpan("embed"));

const first = (rows: readonly Vector[]): Effect.Effect<Vector, EmbeddingFailed> =>
  pipe(Array.head(rows), Effect.fromOption, Effect.mapError(failed));

const readImage = (png: Uint8Array): Effect.Effect<RawImage, EmbeddingFailed> =>
  attempt(() => RawImage.fromBlob(new Blob([Uint8Array.from(png)])));

const make = (
  embed: ReturnType<typeof embedWith>,
  processor: Processor,
  imageToken: string,
): Omit<Context.Service.Shape<typeof Embedder>, "device"> => ({
  embedQuery: (query) =>
    embed(() => Promise.resolve<unknown>(processor([queryPrompt(query)]))).pipe(
      Effect.flatMap(first),
    ),
  embedDocuments: (texts) => {
    const prompts = pipe(texts, Array.map(documentPrompt));
    return embed(() => Promise.resolve<unknown>(processor(prompts)));
  },
  embedImages: (pngs) =>
    pipe(
      pngs,
      Effect.forEach(readImage),
      Effect.flatMap((images) => {
        const tokens = Array.replicate(imageToken, images.length);
        const batch = pipe(images, Array.map(Array.of));
        return embed(() => Promise.resolve<unknown>(processor(tokens, batch)));
      }),
    ),
});

const loadConfig = Effect.gen(function* loadConfig() {
  const config = yield* attempt(() => AutoConfig.from_pretrained(MODEL_ID));
  Reflect.deleteProperty(config, "audio_config");
  return config;
});

/** @internal */
const fetchModel = Effect.fn("fetchModel")(function* fetchModelFiles(directory: string) {
  yield* Effect.sync(() => {
    Object.assign(env, {
      cacheDir: directory,
      allowLocalModels: false,
      allowRemoteModels: true,
      remotePathTemplate: PINNED_REMOTE_PATH,
    });
  });
  const config = yield* loadConfig;
  yield* loadProcessor;
  yield* attempt(() =>
    AutoModel.from_pretrained(MODEL_ID, { config, device: FETCH_DEVICE, dtype: DTYPE }),
  );
});

const localEmbedderLayer = (
  modelDirectory: Option.Option<string>,
): Layer.Layer<Embedder, EmbeddingFailed> =>
  Layer.effect(
    Embedder,
    Effect.gen(function* embedder() {
      yield* Effect.sync(() => {
        pipe(modelDirectory, Option.match({ onNone: downloadPinned, onSome: preferLocalModels }));
      });
      const config = yield* loadConfig;
      const { processor, imageToken } = yield* loadProcessor;
      const { model, device } = yield* loadModel(config);
      return Embedder.of({ device, ...make(embedWith(model), processor, imageToken) });
    }),
  );

export { Embedder, fetchModel, localEmbedderLayer };
export type { Vector };
