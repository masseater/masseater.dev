import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Number as Num, Option, Order, pipe, Schema, Struct } from "effect";
import { vi } from "vite-plus/test";

import { closeDatabase } from "./d1.test.support";
import { handleCatalog } from "./handle.server";
import { listPeople } from "./people.server";
import { seedCatalog, thumbnailOf } from "./ranking.test.support";
import { listSongs } from "./songs.server";
import { listVideos } from "./videos.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support"));

afterAll(() => Effect.runPromise(closeDatabase));

const OK = 200;

const INVALID = 422;

const NO_PARTS = 0;

const TOP_TWO = 2;

const TOP_THREE = 3;

const MORE_THAN_ALL = 10;

const OVER_THE_CAP = 101;

const ONCE = 1;

const TWICE = 2;

const THREE_PARTS = 3;

const Json = Schema.fromJsonString(Schema.Unknown);

const fetchRanking = (path: string): Effect.Effect<Readonly<{ status: number; body: unknown }>> =>
  Effect.gen(function* requestRanking() {
    const response = yield* Effect.promise(() =>
      handleCatalog(new Request(`http://localhost/api/catalog/ranking/${path}`)),
    );
    const text = yield* Effect.promise(() => response.text());
    const body = yield* Schema.decodeEffect(Json)(text).pipe(
      Effect.orElseSucceed((): unknown => text),
    );
    return { status: response.status, body };
  });

const byPartCount = Order.flip(
  Order.mapInput(Num.Order, (found: Readonly<{ partCount: number }>) => found.partCount),
);

it.effect("曲の順位は使った動画の本数の多い順に、指定した件数だけを返す", () =>
  Effect.gen(function* ranksSongs() {
    const { songs } = yield* seedCatalog;
    const ranking = yield* fetchRanking(`songs?limit=${TOP_THREE.toString()}`);
    const all = yield* fetchRanking(`songs?limit=${MORE_THAN_ALL.toString()}`);
    const listed = yield* listSongs(Option.none());
    const everything = pipe(listed, Arr.map(Struct.pick(["id", "title", "useCount"])));
    expect(ranking).toStrictEqual({
      status: OK,
      body: [
        { id: songs.twiceEarlier, title: "あ 二本で使う曲", useCount: TWICE },
        { id: songs.twiceLater, title: "い 二本で使う曲", useCount: TWICE },
        { id: songs.once, title: "ん 一度だけの曲", useCount: ONCE },
      ],
    });
    expect(ranking.body).toStrictEqual(Arr.take(everything, TOP_THREE));
    expect(all.body).toStrictEqual(everything);
  }),
);

it.effect("動画の順位はパートのある動画だけを、パートの多い順に指定した件数だけ返す", () =>
  Effect.gen(function* ranksVideos() {
    const { videos } = yield* seedCatalog;
    const top = yield* fetchRanking(`videos?limit=${TOP_TWO.toString()}`);
    const all = yield* fetchRanking(`videos?limit=${TOP_THREE.toString()}`);
    const everything = yield* listVideos({});
    const featured = pipe(
      everything,
      Arr.filter((found) => found.partCount > NO_PARTS),
      (found) => Arr.sort(found, byPartCount),
      Arr.map(Struct.pick(["id", "title", "kind", "thumbnailUrl", "partCount"])),
    );
    expect(top).toStrictEqual({
      status: OK,
      body: [
        {
          id: videos.longEarlier,
          title: "あ 長いメドレー",
          kind: "medley",
          thumbnailUrl: thumbnailOf("あ 長いメドレー"),
          partCount: THREE_PARTS,
        },
        {
          id: videos.longLater,
          title: "ん 長いメドレー",
          kind: "medley",
          thumbnailUrl: thumbnailOf("ん 長いメドレー"),
          partCount: THREE_PARTS,
        },
      ],
    });
    expect(top.body).toStrictEqual(Arr.take(featured, TOP_TWO));
    expect(all.body).toStrictEqual(featured);
  }),
);

it.effect("担当者の順位は担当したパートの多い順に、指定した件数だけを返す", () =>
  Effect.gen(function* ranksPeople() {
    const { people } = yield* seedCatalog;
    const ranking = yield* fetchRanking(`people?limit=${TOP_THREE.toString()}`);
    const all = yield* fetchRanking(`people?limit=${MORE_THAN_ALL.toString()}`);
    const everything = yield* listPeople(Option.none());
    expect(ranking).toStrictEqual({
      status: OK,
      body: [
        { id: people.doubleEarlier, name: "a 二つの人", creditCount: TWICE },
        { id: people.doubleLater, name: "b 二つの人", creditCount: TWICE },
        { id: people.single, name: "一つだけの人", creditCount: ONCE },
      ],
    });
    expect(ranking.body).toStrictEqual(Arr.take(everything, TOP_THREE));
    expect(all.body).toStrictEqual(everything);
  }),
);

it.effect("順位は件数の指定が無いときと上限を超えるときに断る", () =>
  Effect.gen(function* rejectsBadLimit() {
    yield* seedCatalog;
    const missing = yield* fetchRanking("songs");
    const tooMany = yield* fetchRanking(`songs?limit=${OVER_THE_CAP.toString()}`);
    expect(missing.status).toBe(INVALID);
    expect(tooMany.status).toBe(INVALID);
  }),
);
