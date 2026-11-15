import { YOUTUBE_RETENTION_DAYS } from "@masseater.dev/nimado";
import { Cause, Config, Console, Effect, Option } from "effect";
import { Flag } from "effect/cli";

import { updateCatalog } from "./catalog-run.ts";
import { NICO_BATCH, fetchNicoViews } from "./niconico.ts";
import { refresh, videosOf } from "./refresh.ts";
import { NICO_FILE, YOUTUBE_FILE, jstDate, loadCatalog, saveCatalog } from "./state.ts";
import { activityPage, songPage } from "./vocadb.ts";
import { YOUTUBE_BATCH, fetchYoutubeViews } from "./youtube.ts";

const VOCADB_REQUESTS = 900;
const NICO_REQUESTS = 5000;
const YOUTUBE_UNITS = 9000;
const CHECKPOINT_REQUESTS = 100;
const EPOCH = "0000-00-00";

/** @internal */
export const stateFlag = Flag.String("state").pipe(Flag.withDefault(".state"));

const collectCatalog = Effect.fn("collect.catalog")(function* collectCatalog(state: string) {
  const catalog = yield* loadCatalog(state);
  yield* updateCatalog({
    catalog,
    budget: VOCADB_REQUESTS,
    checkpoint: CHECKPOINT_REQUESTS,
    source: { songs: songPage, activity: activityPage },
    save: Effect.fn("command.catalog.save")(function* saveProgress(updated) {
      yield* saveCatalog({ state, catalog: updated });
      yield* Console.log(
        `catalog: ${updated.songs.length.toString()} 曲、次の位置 ${String(Option.getOrNull(updated.crawl.next))}`,
      );
    }),
  });
});
const collectNico = Effect.fn("collect.nico")(function* collectNico(state: string) {
  const catalog = yield* loadCatalog(state);
  yield* refresh({
    state,
    file: NICO_FILE,
    ids: videosOf({ catalog, pick: ({ nico }) => nico }),
    budget: NICO_REQUESTS * NICO_BATCH,
    batch: NICO_BATCH,
    checkpoint: CHECKPOINT_REQUESTS,
    since: EPOCH,
    lookup: fetchNicoViews,
  });
});

const collectYoutube = Effect.fn("collect.youtube")(function* collectYoutube(state: string) {
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
    budget: YOUTUBE_UNITS * YOUTUBE_BATCH,
    batch: YOUTUBE_BATCH,
    checkpoint: CHECKPOINT_REQUESTS,
    since,
    lookup: (ids) => fetchYoutubeViews({ key: key.value, ids }),
  });
});

const tolerate =
  (name: string) =>
  <Value, Failure, Requirements>(
    collect: Effect.Effect<Value, Failure, Requirements>,
  ): Effect.Effect<void, never, Requirements> =>
    collect.pipe(
      Effect.asVoid,
      Effect.catchCause((cause) =>
        Console.error(`${name} failed, so publish uses its last state\n${Cause.pretty(cause)}`),
      ),
    );

/** @internal */
export const collectAll = Effect.fn("collect.all")(function* collectAll(state: string) {
  yield* tolerate("catalog")(collectCatalog(state));
  yield* tolerate("nico")(collectNico(state));
  yield* tolerate("youtube")(collectYoutube(state));
});
