import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import type { GatewayOptions } from "@r_masseater/workers-tracing/workers-ai";
import { Array as Arr, Context, Effect, pipe } from "effect";

import { meanOf, piecesOf } from "./trait-vector.ts";
import type { Vector } from "./trait-vector.ts";

const EMBEDDING_MODEL = "@cf/pfnet/plamo-embedding-1b";

const EMBED_BATCH = 32;

const fail = failedAt("workers ai");

export type Embed = (
  text: readonly string[],
  options: GatewayOptions,
) => PromiseLike<Readonly<{ data: readonly Vector[] }>>;

export class Embedder extends Context.Service<Embedder, Embed>()(
  "watashi-mcp/entities/trait/api/trait-embed.server/Embedder",
) {}

export const workersEmbedder =
  (ai: Ai): Embed =>
  (text, options) =>
    ai.run(EMBEDDING_MODEL, { text: [...text] }, options);

const embedPieces = Effect.fn("trait.embed")(function* embedPieces(pieces: readonly string[]) {
  const embed = yield* Embedder;
  return yield* runWorkersAi({
    operation: "embeddings",
    model: EMBEDDING_MODEL,
    caller: "watashi-mcp.trait-embed",
    call: (options) => embed(pieces, options),
  }).pipe(
    Effect.mapBoth({
      onFailure: ({ cause }) => fail(cause),
      onSuccess: ({ data }) => data,
    }),
  );
});

const embedAll = (
  pieces: readonly string[],
): Effect.Effect<readonly Vector[], UpstreamFailed, Embedder> =>
  pipe(
    Arr.chunksOf(pieces, EMBED_BATCH),
    (items) => Effect.forEach(items, embedPieces, { concurrency: 1 }),
    Effect.map(Arr.flatten),
  );

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

export const embedTexts = (
  texts: readonly string[],
): Effect.Effect<readonly Vector[], UpstreamFailed, Embedder> => {
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
