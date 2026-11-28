import { afterAll, expect, it } from "@effect/vitest";
import { Effect, Option, String as Str } from "effect";

import { listPeople } from "#/entities/person/@x/catalog.ts";
import { listSongs } from "#/entities/song/@x/catalog.ts";
import { listVideos } from "#/entities/video/@x/catalog.ts";
import { closeDatabase, withCatalog } from "#/shared/db/index.test.support.ts";

import { seedCatalog } from "./ranking.test.support.ts";

afterAll(() => Effect.runPromise(closeDatabase));

const KEYWORD_LIMIT = 100;

const SONGS_USED_TWICE = 2;

const LONGEST_KEYWORD = Str.repeat(KEYWORD_LIMIT)("あ");

type Listed = Readonly<{
  songs: readonly unknown[];
  videos: readonly unknown[];
  people: readonly unknown[];
}>;

const listedFor = (keyword: string): Effect.Effect<Listed> =>
  withCatalog(
    Effect.gen(function* listsByKeyword() {
      yield* seedCatalog;
      const songs = yield* listSongs(Option.some(keyword));
      const videos = yield* listVideos({ keyword });
      const people = yield* listPeople(Option.some(keyword));
      return { songs, videos, people };
    }),
  );

it.effect("上限の 100 文字の語でも D1 に断られずに探す", () =>
  Effect.gen(function* searchesLongestKeyword() {
    const found = yield* listedFor(LONGEST_KEYWORD);
    expect(found).toStrictEqual({ songs: [], videos: [], people: [] });
  }),
);

it.effect("語の一部に当たる曲を返す", () =>
  Effect.gen(function* searchesPartOfTitle() {
    const { songs } = yield* listedFor("二本");
    expect(songs).toHaveLength(SONGS_USED_TWICE);
  }),
);
