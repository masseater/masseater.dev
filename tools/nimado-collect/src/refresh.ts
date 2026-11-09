import { Array as Arr, Console, Effect, Record, pipe } from "effect";

import type { CatalogSongValue, CatalogValue } from "./catalog.ts";
import { jstDate, loadViews, saveViews } from "./state.ts";
import { keepOnly, observe, pickVideos } from "./view-state.ts";

const ROTATION_DAYS = 30;
const TODAY = 0;

const videosOf = ({
  catalog,
  pick,
}: Readonly<{
  catalog: CatalogValue;
  pick: (song: CatalogSongValue) => readonly string[];
}>): readonly string[] => pipe(catalog.songs, Arr.flatMap(pick), Arr.dedupe);

/** @internal */
const refresh = Effect.fn("views.refresh")(function* refreshViews<FetchFailure, FetchServices>({
  state,
  file,
  ids,
  budget,
  since,
  lookup,
}: Readonly<{
  state: string;
  file: string;
  ids: readonly string[];
  budget: number;
  since: string;
  lookup: (
    ids: readonly string[],
  ) => Effect.Effect<Readonly<Record<string, number>>, FetchFailure, FetchServices>;
}>) {
  const date = yield* jstDate(TODAY);
  const stored = yield* loadViews({ state, file });
  const current = keepOnly({ state: stored, keep: ids, since });
  const picked = pickVideos({ state: current, ids, budget, rotationDays: ROTATION_DAYS });
  const views = yield* lookup(picked);
  const value = observe({ state: current, ids: picked, views, date });
  yield* saveViews({ state, file, value });
  yield* Console.log(
    `${file}: ${picked.length.toString()} 本を取得し ${Record.size(views).toString()} 本が見つかった`,
  );
});

export { refresh, videosOf };
