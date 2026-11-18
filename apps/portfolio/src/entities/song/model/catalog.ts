import type { Song as DawSong } from "@masseater.dev/daw-view";
import type { FumxPlugin, Plugins } from "@masseater.dev/fumx-studio/plugin/plugin";
import type { Song as FumxSong } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { dawSongOfFumx } from "./fumx.ts";
import type { Listing } from "./fumx.ts";
import type { Song, Work } from "./song.ts";

const SLUG = 2;

const works = import.meta.glob<Work>("../catalog/*/work.ts", { eager: true, import: "work" });

const thumbnails = import.meta.glob<string>("../catalog/*/thumb.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const recordings = import.meta.glob<DawSong>("../catalog/*/recording.ts", { import: "song" });

const fumxSongs = import.meta.glob<FumxSong>("../catalog/*/song.fumx", { import: "song" });

const pluginModules = import.meta.glob<FumxPlugin>("../catalog/*/plugins/*.ts", {
  import: "plugin",
});

const slugOf = (path: string): Option.Option<string> => Arr.get(Str.split(path, "/"), SLUG);

const bySlug = <Value>(found: Readonly<Record<string, Value>>): ReadonlyMap<string, Value> =>
  new Map(
    pipe(
      Rec.toEntries(found),
      Arr.flatMap(([path, value]) =>
        pipe(
          slugOf(path),
          Option.map((slug): readonly [string, Value] => [slug, value]),
          Option.toArray,
        ),
      ),
    ),
  );

const thumbnailBySlug = bySlug(thumbnails);
const recordingBySlug = bySlug(recordings);
const fumxBySlug = bySlug(fumxSongs);
const workBySlug = bySlug(works);

type Loaded = readonly [string, FumxPlugin];

const loadedIn =
  (folder: string) =>
  ([path, load]: readonly [string, () => Promise<FumxPlugin>]): Effect.Effect<Loaded> => {
    const name = Str.slice(folder.length)(path);
    return Effect.map(Effect.promise(load), (plugin): Loaded => [name, plugin]);
  };

const pluginsOf = (slug: string): Effect.Effect<Plugins> => {
  const folder = `../catalog/${slug}/`;
  const modules = pipe(
    Rec.toEntries(pluginModules),
    Arr.filter(([path]) => Str.startsWith(folder)(path)),
  );
  return Effect.map(
    Effect.forEach(modules, loadedIn(folder), { concurrency: "unbounded" }),
    Rec.fromEntries,
  );
};

const loadedSong =
  (listing: Omit<Listing, "plugins">) =>
  (load: () => Promise<FumxSong>): Promise<DawSong> => {
    const both = Effect.all([Effect.promise(load), pluginsOf(listing.slug)], {
      concurrency: "unbounded",
    });
    const recorded = pipe(
      both,
      Effect.map(([song, plugins]) => dawSongOfFumx({ ...listing, plugins })(song)),
    );
    return Effect.runPromise(recorded);
  };

const fumxRecordingOf = (slug: string): Option.Option<() => Promise<DawSong>> =>
  Option.flatMap(Option.fromUndefinedOr(fumxBySlug.get(slug)), (load) =>
    Option.map(
      Option.fromUndefinedOr(workBySlug.get(slug)),
      (work) => () => loadedSong({ slug, work })(load),
    ),
  );

export const songs: readonly Song[] = pipe(
  [...workBySlug],
  Arr.flatMap(([slug, work]) =>
    pipe(
      Option.fromUndefinedOr(thumbnailBySlug.get(slug)),
      Option.map((thumbnail): Song => ({ ...work, slug, thumbnail })),
      Option.toArray,
    ),
  ),
  Arr.sortWith((song) => song.released, Order.flip(Order.String)),
);

export const songOf = (slug: string): Option.Option<Song> =>
  Arr.findFirst(songs, (song) => song.slug === slug);

export const recordingOf = (slug: string): Option.Option<() => Promise<DawSong>> =>
  Option.orElse(Option.fromUndefinedOr(recordingBySlug.get(slug)), () => fumxRecordingOf(slug));
