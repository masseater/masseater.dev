import type { Song as DawSong } from "@masseater.dev/daw-view";
import type { Song as FumxSong } from "@r_masseater/song-format";
import { Array as Arr, Effect, Option, Order, pipe } from "effect";

import { bySlug, fumxBySlug, pluginsOf } from "./fumx-sources.ts";
import { dawSongOfFumx } from "./fumx.ts";
import type { Listing } from "./fumx.ts";
import type { Song, Work } from "./song.ts";

const works = import.meta.glob<Work>("./catalog/*/work.ts", { eager: true, import: "work" });

const thumbnails = import.meta.glob<string>("./catalog/*/thumb.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const thumbnailBySlug = bySlug(thumbnails);
const workBySlug = bySlug(works);

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

export const recordingOf = (slug: string): Option.Option<() => Promise<DawSong>> =>
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
