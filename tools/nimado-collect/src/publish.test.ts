import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { CatalogSongValue } from "./catalog.ts";
import { measureSongs } from "./publish.ts";
import type { States } from "./publish.ts";
import type { ViewStateValue } from "./view-state.ts";

const REACHED = 10_000;
const HIGHER = 20_000;
const SHORT = 9999;
const FIRST = 1;
const SECOND = 2;
const DATE = "2026-01-01";

const seen = (views: number): ViewStateValue[string] => [Option.some(views), DATE];

const missing: ViewStateValue[string] = [Option.none(), DATE];

const song = ({
  id,
  nico,
  youtube,
}: Readonly<{
  id: number;
  nico: readonly string[];
  youtube: readonly string[];
}>): CatalogSongValue => ({
  id,
  name: "曲",
  artist: "作者",
  type: "Original",
  published: DATE,
  nico,
  youtube,
});

const CASES: readonly Readonly<{
  title: string;
  songs: readonly CatalogSongValue[];
  states: States;
  measured: readonly Readonly<{
    id: number;
    nico: Option.Option<number>;
    youtube: Option.Option<number>;
  }>[];
}>[] = [
  {
    title: "ニコニコの再生数がしきい値に届いた曲を残す",
    songs: [song({ id: FIRST, nico: ["sm1"], youtube: [] })],
    states: { nico: { sm1: seen(REACHED) }, youtube: {} },
    measured: [{ id: FIRST, nico: Option.some(REACHED), youtube: Option.none() }],
  },
  {
    title: "YouTube の再生数だけがしきい値に届いた曲も残す",
    songs: [song({ id: FIRST, nico: ["sm1"], youtube: ["yt1"] })],
    states: { nico: { sm1: seen(SHORT) }, youtube: { yt1: seen(REACHED) } },
    measured: [{ id: FIRST, nico: Option.some(SHORT), youtube: Option.some(REACHED) }],
  },
  {
    title: "どちらもしきい値に届かない曲を落とす",
    songs: [
      song({ id: FIRST, nico: ["sm1"], youtube: ["yt1"] }),
      song({ id: SECOND, nico: ["sm2"], youtube: [] }),
    ],
    states: { nico: { sm1: seen(SHORT), sm2: seen(REACHED) }, youtube: { yt1: seen(SHORT) } },
    measured: [{ id: SECOND, nico: Option.some(REACHED), youtube: Option.none() }],
  },
  {
    title: "動画が複数ある曲は、いちばん多い再生数で測る",
    songs: [song({ id: FIRST, nico: ["sm1", "sm2", "sm3"], youtube: [] })],
    states: { nico: { sm1: seen(SHORT), sm2: seen(HIGHER), sm3: seen(REACHED) }, youtube: {} },
    measured: [{ id: FIRST, nico: Option.some(HIGHER), youtube: Option.none() }],
  },
  {
    title: "値が取れなかった動画と状態に無い動画を数えない",
    songs: [song({ id: FIRST, nico: ["sm1", "sm2", "sm3"], youtube: ["yt1"] })],
    states: { nico: { sm1: missing, sm2: seen(REACHED) }, youtube: { yt1: missing } },
    measured: [{ id: FIRST, nico: Option.some(REACHED), youtube: Option.none() }],
  },
  {
    title: "値が 1 つも取れていない曲を落とす",
    songs: [song({ id: FIRST, nico: ["sm1"], youtube: ["yt1"] })],
    states: { nico: { sm1: missing }, youtube: {} },
    measured: [],
  },
];

describe("measureSongs", () => {
  it.each(CASES)("$title", ({ songs, states, measured }) => {
    const result = pipe(
      measureSongs({ songs, states }),
      Arr.map(({ song: { id }, nico, youtube }) => ({ id, nico, youtube })),
    );
    expect(result).toStrictEqual(measured);
  });
});
