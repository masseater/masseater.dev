import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { recordingOf, songs } from "./catalog.ts";

const works = import.meta.glob("../catalog/*/work.ts");

const sampleTables = import.meta.glob<Readonly<Record<string, unknown>>>(
  "../catalog/*/samples.json",
  { eager: true, import: "default" },
);

const sampleFiles = import.meta.glob("../catalog/*/samples/*.flac");

const filesOf = (slug: string): readonly string[] =>
  pipe(
    Rec.keys(sampleFiles),
    Arr.filter(Str.startsWith(`../catalog/${slug}/samples/`)),
    Arr.map((path) => Str.replace(/^.*\/(?<name>[^/]+)\.flac$/u, "$<name>")(path)),
    Arr.sortWith((name) => name, Str.Order),
  );

const tableOf = (slug: string): readonly string[] =>
  pipe(
    Rec.get(sampleTables, `../catalog/${slug}/samples.json`),
    Option.map(Rec.keys),
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
});
