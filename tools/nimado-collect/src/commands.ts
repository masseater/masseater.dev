import { YOUTUBE_RETENTION_DAYS } from "@masseater.dev/nimado";
import { Config, Console, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";

import { updateCatalog } from "./catalog-run.ts";
import { NICO_BATCH, fetchNicoViews } from "./niconico.ts";
import { refresh, videosOf } from "./refresh.ts";
import { NICO_FILE, YOUTUBE_FILE, jstDate, loadCatalog, saveCatalog } from "./state.ts";
import { YOUTUBE_BATCH, fetchYoutubeViews } from "./youtube.ts";

const VOCADB_REQUESTS = 900;
const NICO_REQUESTS = 5000;
const YOUTUBE_UNITS = 9000;
const EPOCH = "0000-00-00";

/** @internal */
const stateFlag = Flag.String("state").pipe(Flag.withDefault(".state"));

const budgetFlag = (fallback: number): Flag.Flag<number> =>
  Flag.Int("budget").pipe(Flag.withDefault(fallback));

/** @internal */
const catalogCommand = Command.make(
  "catalog",
  { state: stateFlag, budget: budgetFlag(VOCADB_REQUESTS) },
  ({ state, budget }) =>
    loadCatalog(state).pipe(
      Effect.flatMap((catalog) => updateCatalog({ catalog, budget })),
      Effect.tap((catalog) => saveCatalog({ state, catalog })),
      Effect.flatMap((catalog) =>
        Console.log(
          `catalog: ${catalog.songs.length.toString()} 曲、次の位置 ${String(Option.getOrNull(catalog.crawl.next))}`,
        ),
      ),
    ),
);

/** @internal */
const nicoCommand = Command.make(
  "nico",
  { state: stateFlag, budget: budgetFlag(NICO_REQUESTS) },
  ({ state, budget }) =>
    loadCatalog(state).pipe(
      Effect.flatMap((catalog) =>
        refresh({
          state,
          file: NICO_FILE,
          ids: videosOf({ catalog, pick: ({ nico }) => nico }),
          budget: budget * NICO_BATCH,
          since: EPOCH,
          lookup: fetchNicoViews,
        }),
      ),
    ),
);

/** @internal */
const youtubeCommand = Command.make(
  "youtube",
  { state: stateFlag, budget: budgetFlag(YOUTUBE_UNITS) },
  ({ state, budget }) =>
    Effect.gen(function* collectYoutube() {
      const key = yield* Config.option(Config.Redacted("YOUTUBE_API_KEY"));
      if (Option.isNone(key)) {
        return yield* Console.log("youtube: YOUTUBE_API_KEY が無いので取得しない");
      }
      const catalog = yield* loadCatalog(state);
      const since = yield* jstDate(-YOUTUBE_RETENTION_DAYS);
      return yield* refresh({
        state,
        file: YOUTUBE_FILE,
        ids: videosOf({ catalog, pick: ({ youtube }) => youtube }),
        budget: budget * YOUTUBE_BATCH,
        since,
        lookup: (ids) => fetchYoutubeViews({ key: key.value, ids }),
      });
    }),
);

export { catalogCommand, nicoCommand, stateFlag, youtubeCommand };
