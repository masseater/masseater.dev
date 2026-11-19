import { keyOf, sampleFilesOf } from "@masseater.dev/fumx-studio";
import type { Song as FumxSong } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { recordingOf, songs } from "./catalog.ts";

const works = import.meta.glob("../catalog/*/work.ts");

const sampleTables = import.meta.glob<Readonly<Record<string, unknown>>>(
  "../catalog/*/samples.json",
  { eager: true, import: "default" },
);

const sampleFiles = import.meta.glob("../catalog/*/samples/*.flac");

const fumxSongs = import.meta.glob<FumxSong>("../catalog/*/song.fumx", {
  eager: true,
  import: "song",
});

const fumxOf = (slug: string): Option.Option<FumxSong> =>
  Rec.get(fumxSongs, `../catalog/${slug}/song.fumx`);

const baseName = (path: string): string =>
  Str.replace(/^(?:.*\/)?(?<name>[^/]+)\.flac$/u, "$<name>")(path);

const filesOf = (slug: string): readonly string[] =>
  pipe(
    Rec.keys(sampleFiles),
    Arr.filter(Str.startsWith(`../catalog/${slug}/samples/`)),
    Arr.map(baseName),
    Arr.sortWith((name) => name, Str.Order),
  );

const tableOf = (slug: string): readonly string[] =>
  pipe(
    Option.match(fumxOf(slug), {
      onNone: () => Option.map(Rec.get(sampleTables, `../catalog/${slug}/samples.json`), Rec.keys),
      onSome: (song) => Option.some(Arr.map(sampleFilesOf(song), baseName)),
    }),
    Option.getOrElse((): readonly string[] => []),
    Arr.sortWith((name) => name, Str.Order),
  );

describe("the song catalog", () => {
  test("lists every song that has a work", () => {
    expect(songs).toHaveLength(Rec.size(works));
  });

  test.each(songs)("$slug has a recording", ({ slug }) => {
    expect(Option.isSome(recordingOf(slug))).toBe(true);
  });

  test.each(songs)("$slug ships exactly the samples its program reads", ({ slug }) => {
    expect(filesOf(slug)).toStrictEqual(tableOf(slug));
  });

  test.each(songs)("$slug states the tempo and any key its song.fumx implies", (work) => {
    Option.map(fumxOf(work.slug), (song) => {
      expect(Option.map(Arr.head(song.bars), (bar) => bar.tempo.bpm)).toStrictEqual(
        Option.some(work.tempo),
      );
      Option.map(keyOf(song), (key) => {
        expect(key).toBe(work.key);
      });
    });
  });
});
