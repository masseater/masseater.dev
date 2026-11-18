import { Array as Arr, Effect, MutableHashMap, Option, pipe } from "effect";

import type { Workspace } from "#/entities/workspace/index.ts";
import type { Embedder, Vector } from "#/shared/lib/embedder.ts";
import type { EmbeddingFailed } from "#/shared/lib/embedding-failed.ts";

import type { Candidate } from "./rank.ts";

export interface Located {
  readonly root: string;
  readonly workspace: Workspace;
}

export interface VectorStore {
  readonly embedMissing: (candidates: readonly Located[]) => Effect.Effect<void, EmbeddingFailed>;
  readonly vectorsOf: (candidates: readonly Located[]) => readonly Candidate<Located>[];
}

const BATCH = 8;

const keyOf = ({ workspace }: Located): string =>
  `${workspace.directory}\n${workspace.description}`;

const documentOf = ({ workspace }: Located): Readonly<{ title: string; text: string }> => ({
  title: workspace.directory,
  text: workspace.description,
});

/** @internal */
export const vectorStore = (embedder: Embedder["Service"]): VectorStore => {
  const vectors = MutableHashMap.empty<string, Vector>();
  const isMissing = (candidate: Located): boolean => !MutableHashMap.has(vectors, keyOf(candidate));
  const embedMissing = Effect.fn("embedMissing")(function* embedMissing(
    candidates: readonly Located[],
  ) {
    const missing = pipe(candidates, Arr.filter(isMissing));
    if (!Arr.isReadonlyArrayNonEmpty(missing)) {
      return;
    }
    for (const batch of Arr.chunksOf(missing, BATCH)) {
      const embedded = yield* embedder.embedDocuments(pipe(batch, Arr.map(documentOf)));
      for (const [candidate, vector] of Arr.zip(batch, embedded)) {
        MutableHashMap.set(vectors, keyOf(candidate), vector);
      }
    }
  });
  const vectorOf = (candidate: Located): readonly Candidate<Located>[] =>
    pipe(
      MutableHashMap.get(vectors, keyOf(candidate)),
      Option.map((vector) => ({ item: candidate, vector })),
      Option.toArray,
    );
  return {
    embedMissing,
    vectorsOf: (candidates) => pipe(candidates, Arr.flatMap(vectorOf)),
  };
};
