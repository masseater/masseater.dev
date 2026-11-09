import {
  DATA_DIR,
  DayViews,
  Meta,
  Shard,
  Table,
  YOUTUBE_RETENTION_DAYS,
  dayPath,
  daysDir,
  metaPath,
  shardPath,
  tablePath,
} from "@masseater.dev/nimado";
import type { PlatformName } from "@masseater.dev/nimado";
import {
  Array as Arr,
  DateTime,
  Effect,
  FileSystem,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";
import { Command, Flag } from "effect/cli";

import { stateFlag } from "./commands.ts";
import { writeJson } from "./files.ts";
import { dayOf, measureSongs, shardsOf, tableOf } from "./publish.ts";
import type { Measured, States } from "./publish.ts";
import { NICO_FILE, TODAY, YOUTUBE_FILE, jstDate, loadCatalog, loadViews } from "./state.ts";

const DATE_START = 0;
const DATE_LENGTH = 10;
const PLATFORMS: readonly PlatformName[] = ["nico", "youtube"];

interface Output {
  readonly state: string;
  readonly out: string;
}

const listDays = Effect.fn("publish.days.list")(function* listDaysIn(dir: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const exists = yield* fileSystem.exists(dir);
  if (!exists) {
    return [];
  }
  const entries = yield* fileSystem.readDirectory(dir);
  return pipe(
    entries,
    Arr.filter(Str.endsWith(".json")),
    Arr.map(Str.slice(DATE_START, DATE_LENGTH)),
    Arr.sortWith((day) => day, Str.Order),
  );
});

const writeDays = Effect.fn("publish.days.write")(function* writeDaysOf({
  state,
  songs,
  date,
}: Readonly<{ state: string; songs: readonly Measured[]; date: string }>) {
  const path = yield* Path.Path;
  yield* pipe(
    PLATFORMS,
    Arr.map((platform) => [platform, dayOf(platform)(songs)] as const),
    Arr.filter(([, views]) => Arr.isReadonlyArrayNonEmpty(views)),
    Effect.forEach(([platform, views]) =>
      writeJson({
        codec: DayViews,
        file: path.join(state, dayPath({ platform, date })),
        value: views,
      }),
    ),
  );
});

const expireYoutube = Effect.fn("publish.days.expire")(function* expireOldYoutube(state: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const oldest = yield* jstDate(-YOUTUBE_RETENTION_DAYS);
  const days = yield* listDays(path.join(state, daysDir("youtube")));
  yield* pipe(
    days,
    Arr.filter((day) => day < oldest),
    Effect.forEach((date) =>
      fileSystem.remove(path.join(state, dayPath({ platform: "youtube", date }))),
    ),
  );
});

const copyDays = Effect.fn("publish.days.copy")(function* copyDaysTo({ state, out }: Output) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.remove(path.join(out, DATA_DIR), { recursive: true, force: true });
  yield* pipe(
    PLATFORMS,
    Effect.forEach((platform) => {
      const from = path.join(state, daysDir(platform));
      const to = path.join(out, daysDir(platform));
      return fileSystem
        .makeDirectory(path.dirname(to), { recursive: true })
        .pipe(Effect.andThen(fileSystem.copy(from, to)));
    }),
  );
});

const writeSongs = Effect.fn("publish.songs")(function* writeSongsTo({
  out,
  songs,
  states,
}: Readonly<{ out: string; songs: readonly Measured[]; states: States }>) {
  const path = yield* Path.Path;
  yield* pipe(
    shardsOf({ songs, states }),
    Effect.forEach(([shard, details]) =>
      writeJson({ codec: Shard, file: path.join(out, shardPath(shard)), value: details }),
    ),
  );
  yield* writeJson({ codec: Table, file: path.join(out, tablePath), value: tableOf(songs) });
});

const writeMeta = Effect.fn("publish.meta")(function* writeMetaTo({
  state,
  out,
  songs,
  catalogComplete,
}: Output & Readonly<{ songs: number; catalogComplete: boolean }>) {
  const path = yield* Path.Path;
  const now = yield* DateTime.now;
  const nico = yield* listDays(path.join(state, daysDir("nico")));
  const youtube = yield* listDays(path.join(state, daysDir("youtube")));
  yield* writeJson({
    codec: Meta,
    file: path.join(out, metaPath),
    value: {
      generatedAt: DateTime.formatIso(now),
      songs,
      catalogComplete,
      days: { nico, youtube },
    },
  });
});

const loadStates = Effect.fn("publish.states")(function* loadStatesOf(state: string) {
  const nico = yield* loadViews({ state, file: NICO_FILE });
  const youtube = yield* loadViews({ state, file: YOUTUBE_FILE });
  const states: States = { nico, youtube };
  return states;
});

const publish = Effect.fn("command.publish")(function* publishSite({ state, out }: Output) {
  const catalog = yield* loadCatalog(state);
  const states = yield* loadStates(state);
  const songs = measureSongs({ songs: catalog.songs, states });
  const date = yield* jstDate(TODAY);
  yield* writeDays({ state, songs, date });
  yield* expireYoutube(state);
  yield* copyDays({ state, out });
  yield* writeSongs({ out, songs, states });
  const catalogComplete = Option.isNone(catalog.crawl.next);
  yield* writeMeta({ state, out, songs: songs.length, catalogComplete });
});

/** @internal */
const publishCommand = Command.make(
  "publish",
  { state: stateFlag, out: Flag.String("out") },
  publish,
);

export { publishCommand };
