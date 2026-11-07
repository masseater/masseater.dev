import { NodeServices } from "@effect/platform-node";
import { wasmURL } from "@typescript/typescript-wasip1-wasm";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { markerNamed, markersNamed, trackNamed } from "rpp-kit";
import { beforeAll, describe, expect, expectTypeOf, it } from "vite-plus/test";

import { createChecker } from "./src/pages/demo/model/checker";
import type { Checker } from "./src/pages/demo/model/checker";
import { song } from "./src/pages/demo/model/song";

const RPP_KIT = import.meta.glob<string>(
  ["/node_modules/rpp-kit/package.json", "/node_modules/rpp-kit/src/*.ts", "!**/*.test.ts"],
  { query: "?raw", import: "default", eager: true },
);

const MODEL = import.meta.glob<string>(
  ["./src/pages/demo/model/song.ts", "./src/pages/demo/model/*.d.rpp.ts"],
  { query: "?raw", import: "default", eager: true },
);

const TRACK_NAMES = [
  "Midi GM",
  "Bass    (BB)",
  "Drums   (BB)",
  "Piano   (BB)",
  "Strings (BB)",
  "Melody  (BB)",
] as const;

const MARKER_NAMES = ["Gm9", "Cm9", "Bb2", "Gm7", "Ebm9", "Ebm11", "Fm9"] as const;

const MARKER_COUNT = 25;

const CM9_TIME = 16;

const PROBE_PATH = "/probe.ts";

const MODEL_DIRECTORY = "./src/pages/demo/model/";

const PROBE = pipe(
  [
    'import { markerNamed, markersNamed, trackNamed, tracksNamed } from "rpp-kit";',
    'import { song } from "./song";',
    'trackNamed(song, "Drums   (BB)");',
    'tracksNamed(song, "Midi GM");',
    'markerNamed(song, "Cm9");',
    'markersNamed(song, "Gm9");',
    'trackNamed(song, "Drums");',
    'markerNamed(song, "Gm8");',
    'trackNamed(song, "");',
    'markerNamed(song, "");',
  ],
  Arr.join("\n"),
);

const EMPTY_ARGUMENT = /""\)/gu;

const CLOSING_QUOTE = '")'.length - '"'.length;

type Probed = Readonly<{ errors: readonly string[]; completions: readonly (readonly string[])[] }>;

const cache: Probed[] = [];

const files = (): readonly (readonly [string, string])[] => [
  ...Rec.toEntries(RPP_KIT),
  ...pipe(
    Rec.toEntries(MODEL),
    Arr.map(([path, code]) => [pipe(path, Str.replace(MODEL_DIRECTORY, "/")), code] as const),
  ),
];

const checkerOf: Effect.Effect<Checker, never, FileSystem.FileSystem> = FileSystem.FileSystem.pipe(
  Effect.flatMap((fileSystem) => fileSystem.readFile(wasmURL.pathname)),
  Effect.flatMap((bytes) => createChecker({ wasm: new Uint8Array(bytes).buffer, files: files() })),
  Effect.orDie,
);

const emptyArguments = (): readonly number[] =>
  pipe(
    PROBE,
    Str.matchAll(EMPTY_ARGUMENT),
    Arr.fromIterable,
    Arr.flatMap(({ index }) =>
      pipe(
        Option.fromNullishOr(index),
        Option.map((start) => start + CLOSING_QUOTE),
        Option.toArray,
      ),
    ),
  );

const probed = (checker: Checker): Probed => {
  const at = { path: PROBE_PATH, code: PROBE };
  return {
    errors: pipe(
      checker.lint(at),
      Arr.map(({ message }) => message),
    ),
    completions: pipe(
      emptyArguments(),
      Arr.map((position) =>
        pipe(
          checker.complete({ ...at, position }).options,
          Arr.map(({ label }) => label),
          Arr.sortWith((name) => name, Order.String),
        ),
      ),
    ),
  };
};

const run = (): Promise<void> =>
  Effect.runPromise(
    checkerOf.pipe(
      Effect.map(probed),
      Effect.flatMap((result) =>
        Effect.sync(() => {
          cache.push(result);
        }),
      ),
      Effect.provide(NodeServices.layer),
    ),
  );

const probe = (): Probed =>
  pipe(
    Arr.head(cache),
    Arr.fromOption,
    Arr.match({
      onNonEmpty: ([found]) => found,
      onEmpty: () => ({ errors: [], completions: [] }),
    }),
  );

describe("import した .rpp の名前で引く関数の型", () => {
  beforeAll(run);

  it("候補に、トラックとマーカーの名前が全部出る", () => {
    expect(probe().completions).toStrictEqual([
      pipe(
        TRACK_NAMES,
        Arr.sortWith((name) => name, Order.String),
      ),
      pipe(
        MARKER_NAMES,
        Arr.sortWith((name) => name, Order.String),
      ),
    ]);
  });

  it("存在する名前なら型のエラーにならず、無い名前はエラーになる", () => {
    expect(probe().errors).toStrictEqual([
      expect.stringContaining('"Drums"'),
      expect.stringContaining('"Gm8"'),
      expect.stringContaining('""'),
      expect.stringContaining('""'),
    ]);
  });
});

describe("import した .rpp の tracks と markers", () => {
  it("並びの番号や名前で取ると、名前と時刻がリテラルの型になる", () => {
    const [midi, , drums] = song.tracks;
    const [, cm9, gm9] = song.markers;
    expectTypeOf(midi.name).toEqualTypeOf<"Midi GM">();
    expectTypeOf(trackNamed(song, "Drums   (BB)")).toEqualTypeOf(drums);
    expectTypeOf(markerNamed(song, "Cm9").time).toEqualTypeOf<typeof CM9_TIME>();
    expectTypeOf(markerNamed(song, "Cm9")).toEqualTypeOf(cm9);
    expectTypeOf(gm9.name).toEqualTypeOf<"Gm9">();
  });

  it("マーカーは 25 個とも時刻の順に残り、同じ名前のものを全部引ける", () => {
    expect({
      count: song.markers.length,
      gm9: pipe(
        markersNamed(song, "Gm9"),
        Arr.map(({ time }) => ({ time })),
      ),
    }).toStrictEqual({
      count: MARKER_COUNT,
      gm9: [
        { time: 0 },
        { time: 24 },
        { time: 56 },
        { time: 72 },
        { time: 104 },
        { time: 120 },
        { time: 152 },
      ],
    });
  });
});
