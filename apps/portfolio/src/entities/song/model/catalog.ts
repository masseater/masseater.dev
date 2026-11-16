import type { Song as DawSong } from "@masseater.dev/daw-view";
import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import type { Song, Work } from "./song.ts";

const SLUG = 2;

const works = import.meta.glob<Work>("../catalog/*/work.ts", { eager: true, import: "work" });

const thumbnails = import.meta.glob<string>("../catalog/*/thumb.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const recordings = import.meta.glob<DawSong>("../catalog/*/recording.ts", { import: "song" });

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

export const songs: readonly Song[] = pipe(
  [...bySlug(works)],
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
  Option.fromUndefinedOr(recordingBySlug.get(slug));
