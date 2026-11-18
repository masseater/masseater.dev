import { env, pipeline } from "@huggingface/transformers";
import { Array as Arr, Context, Effect, Layer, Schema, pipe } from "effect";

import { EmbeddingFailed } from "./embedding-failed.ts";

const MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
const MODEL_REVISION = "daa72c51243991dfcaf9f9137d2c573d8f7790c0";
const DTYPE = "q4";

export type Vector = readonly number[];

export interface Document {
  readonly title: string;
  readonly text: string;
}

export class Embedder extends Context.Service<
  Embedder,
  {
    readonly embedQuery: (query: string) => Effect.Effect<Vector, EmbeddingFailed>;
    readonly embedDocuments: (
      documents: readonly Document[],
    ) => Effect.Effect<readonly Vector[], EmbeddingFailed>;
  }
>()("@r_masseater/kogane/shared/lib/embedder") {}

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(Schema.Array(Schema.Finite)));

const failed = (cause: unknown): EmbeddingFailed => EmbeddingFailed.make({ cause });

const queryPrompt = (query: string): string => `task: search result | query: ${query}`;

const documentPrompt = ({ title, text }: Document): string => `title: ${title} | text: ${text}`;

export const embedderLayer = (cacheDirectory: string): Layer.Layer<Embedder, EmbeddingFailed> =>
  Layer.effect(
    Embedder,
    Effect.gen(function* loadEmbedder() {
      Object.assign(env, { cacheDir: cacheDirectory });
      const extract = yield* Effect.tryPromise({
        try: () =>
          pipeline("feature-extraction", MODEL_ID, { dtype: DTYPE, revision: MODEL_REVISION }),
        catch: failed,
      });
      const embed = (texts: readonly string[]): Effect.Effect<readonly Vector[], EmbeddingFailed> =>
        Effect.tryPromise({
          try: () => extract([...texts], { pooling: "mean", normalize: true }),
          catch: failed,
        }).pipe(
          Effect.flatMap((tensor) => decodeRows(tensor.tolist())),
          Effect.mapError(failed),
        );
      return Embedder.of({
        embedQuery: (query) =>
          embed([queryPrompt(query)]).pipe(
            Effect.flatMap((rows) => Effect.fromOption(Arr.head(rows))),
            Effect.mapError(failed),
          ),
        embedDocuments: (documents) => embed(pipe(documents, Arr.map(documentPrompt))),
      });
    }),
  );
