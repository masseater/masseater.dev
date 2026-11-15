import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import { env } from "cloudflare:workers";
import { Array as Arr, Effect, pipe } from "effect";

import { meanOf, piecesOf } from "./trait-vector";
import type { Vector } from "./trait-vector";

const EMBEDDING_MODEL = "@cf/pfnet/plamo-embedding-1b";

const EMBED_BATCH = 32;

const fail = failedAt("workers ai");

const embedPieces = (pieces: readonly string[]): Effect.Effect<readonly Vector[], UpstreamFailed> =>
  runWorkersAi({
    operation: "embeddings",
    model: EMBEDDING_MODEL,
    call: () => env.AI.run(EMBEDDING_MODEL, { text: [...pieces] }),
  }).pipe(
    Effect.mapBoth({
      onFailure: ({ cause }) => fail(cause),
      onSuccess: ({ data }) => data,
    }),
  );

const embedAll = (pieces: readonly string[]): Effect.Effect<readonly Vector[], UpstreamFailed> =>
  pipe(Arr.chunksOf(pieces, EMBED_BATCH), Effect.forEach(embedPieces), Effect.map(Arr.flatten));

const meanAt =
  (embedded: readonly (readonly [number, Vector])[]) =>
  (_text: string, index: number): Vector =>
    Arr.match(
      pipe(
        embedded,
        Arr.filter(([owner]) => owner === index),
        Arr.map(([, vector]) => vector),
      ),
      { onEmpty: (): Vector => [], onNonEmpty: meanOf },
    );

const embedTexts = (texts: readonly string[]): Effect.Effect<readonly Vector[], UpstreamFailed> => {
  const owners = pipe(
    texts,
    Arr.flatMap((text, index) =>
      pipe(
        piecesOf(text),
        Arr.map((piece) => [index, piece] as const),
      ),
    ),
  );
  return embedAll(
    pipe(
      owners,
      Arr.map(([, piece]) => piece),
    ),
  ).pipe(
    Effect.map((vectors) => {
      const embedded = Arr.zipWith(owners, vectors, ([owner], vector) => [owner, vector] as const);
      return pipe(texts, Arr.map(meanAt(embedded)));
    }),
  );
};

export { embedTexts };
