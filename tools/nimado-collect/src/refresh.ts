import { Array as Arr, Console, Effect, Record, Stream, pipe } from "effect";

import type { CatalogSongValue, CatalogValue } from "./catalog.ts";
import { collect } from "./progress.ts";
import { jstDate, loadViews, saveViews } from "./state.ts";
import { keepOnly, observe, pickVideos } from "./view-state.ts";

const ROTATION_DAYS = 30;
const MISS_GRACE_DAYS = 3;
const TODAY = 0;

type Batch = Readonly<{ ids: readonly string[]; views: Readonly<Record<string, number>> }>;

const videosOf = ({
  catalog,
  pick,
}: Readonly<{
  catalog: CatalogValue;
  pick: (song: CatalogSongValue) => readonly string[];
}>): readonly string[] => pipe(catalog.songs, Arr.flatMap(pick), Arr.dedupe);

const merged = (batches: readonly Batch[]): Batch => ({
  ids: pipe(
    batches,
    Arr.flatMap(({ ids }) => ids),
  ),
  views: pipe(
    batches,
    Arr.flatMap(({ views }) => Record.toEntries(views)),
    Record.fromEntries,
  ),
});

const batchesOf = <Failure, Services>({
  ids,
  batch,
  lookup,
}: Readonly<{
  ids: readonly string[];
  batch: number;
  lookup: (
    ids: readonly string[],
  ) => Effect.Effect<Readonly<Record<string, number>>, Failure, Services>;
}>): Stream.Stream<Batch, Failure, Services> => {
  const chunks = Arr.chunksOf(ids, batch);
  return Stream.fromIterable(chunks).pipe(
    Stream.mapEffect((chunk) =>
      Effect.map(lookup(chunk), (views): Batch => ({ ids: chunk, views })),
    ),
  );
};

/** @internal */
const refresh = Effect.fn("views.refresh")(function* refreshViews<FetchFailure, FetchServices>({
  state,
  file,
  ids,
  budget,
  batch,
  checkpoint,
  since,
  lookup,
}: Readonly<{
  state: string;
  file: string;
  ids: readonly string[];
  budget: number;
  batch: number;
  checkpoint: number;
  since: string;
  lookup: (
    ids: readonly string[],
  ) => Effect.Effect<Readonly<Record<string, number>>, FetchFailure, FetchServices>;
}>) {
  const date = yield* jstDate(TODAY);
  const keepAfter = yield* jstDate(-MISS_GRACE_DAYS);
  const stored = yield* loadViews({ state, file });
  const current = keepOnly({ state: stored, keep: ids, since });
  const picked = pickVideos({ state: current, ids, budget, rotationDays: ROTATION_DAYS });
  yield* collect({
    items: batchesOf({ ids: picked, batch, lookup }),
    checkpoint,
    save: Effect.fn("views.save")(function* saveProgress(batches: readonly Batch[]) {
      const looked = merged(batches);
      const value = observe({ state: current, ...looked, date, keepAfter });
      yield* saveViews({ state, file, value });
      yield* Console.log(
        `${file}: ${looked.ids.length.toString()} 本を取得し ${Record.size(looked.views).toString()} 本が見つかった`,
      );
    }),
  });
});

export { refresh, videosOf };
