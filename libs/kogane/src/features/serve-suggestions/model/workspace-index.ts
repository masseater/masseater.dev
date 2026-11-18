import { Array as Arr, Context, Effect, Layer, pipe } from "effect";
import type { FileSystem, Path } from "effect";

import { monorepoRoots, workspacesIn } from "#/entities/workspace/index.ts";
import type { Suggestion } from "#/shared/api/index.ts";
import { Embedder } from "#/shared/lib/embedder.ts";
import type { EmbeddingFailed } from "#/shared/lib/embedding-failed.ts";

import { rank } from "./rank.ts";
import type { Scored } from "./rank.ts";
import { vectorStore } from "./vector-store.ts";
import type { Located } from "./vector-store.ts";

const ROOT_CONCURRENCY = 4;

export class WorkspaceIndex extends Context.Service<
  WorkspaceIndex,
  {
    readonly suggest: (
      directory: string,
      prompt: string,
    ) => Effect.Effect<readonly Suggestion[], EmbeddingFailed>;
  }
>()("@r_masseater/kogane/features/serve-suggestions/model/workspace-index/WorkspaceIndex") {}

const locatedIn = Effect.fn("locatedIn")(function* locatedIn(root: string) {
  const workspaces = yield* workspacesIn(root);
  return pipe(
    workspaces,
    Arr.map((workspace): Located => ({ root, workspace })),
  );
});

const located = Effect.fn("located")(function* located(directory: string) {
  const roots = yield* monorepoRoots(directory);
  const found = yield* Effect.forEach(roots, locatedIn, { concurrency: ROOT_CONCURRENCY });
  return Arr.flatten(found);
});

const suggestionOf = ({ item: { root, workspace }, score }: Scored<Located>): Suggestion => ({
  name: workspace.name,
  root,
  directory: workspace.directory,
  description: workspace.description,
  score,
});

/** @internal */
export const workspaceIndexLayer: Layer.Layer<
  WorkspaceIndex,
  never,
  Embedder | FileSystem.FileSystem | Path.Path
> = Layer.effect(
  WorkspaceIndex,
  Effect.gen(function* workspaceIndex() {
    const embedder = yield* Embedder;
    const services = yield* Effect.context<FileSystem.FileSystem | Path.Path>();
    const store = vectorStore(embedder);
    return WorkspaceIndex.of({
      suggest: Effect.fn("suggest")(function* suggest(directory: string, prompt: string) {
        const candidates = yield* located(directory);
        yield* store.embedMissing(candidates);
        const query = yield* embedder.embedQuery(prompt);
        return pipe(rank(query)(store.vectorsOf(candidates)), Arr.map(suggestionOf));
      }, Effect.provideContext(services)),
    });
  }),
);
