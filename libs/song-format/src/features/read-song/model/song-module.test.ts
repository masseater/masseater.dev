import { NodeFileSystem } from "@effect/platform-node-shared";
import { expect, expectTypeOf, it, layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, Option, String as Str, pipe } from "effect";
import { renderSegments } from "mapped-import";
import { declarationPathOf } from "mapped-import/vite";

import { FumxLanguageMetaData } from "#generated/langium/module.ts";

import { song } from "./fixtures/two-five-one.fumx";
import { songModuleOf } from "./song-module.ts";

const [EXTENSION] = FumxLanguageMetaData.fileExtensions;

const FIXTURES = new URL("./fixtures/", import.meta.url).pathname;

const declarationOf = (path: string, content: string): Effect.Effect<Option.Option<string>> =>
  songModuleOf({ path, content, read: () => Effect.succeed("") }).pipe(
    Effect.map(({ mapped }) => {
      if (mapped.status === "error") {
        return Option.none();
      }
      return Option.some(renderSegments({ content, segments: mapped.segments }));
    }),
  );

const pairOf = Effect.fn("pairOf")(function* pairOf(path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const content = yield* fileSystem.readFileString(path);
  const written = yield* fileSystem.readFileString(declarationPathOf(EXTENSION)(path));
  const mapped = yield* declarationOf(path, content);
  return { written: Option.some(written), mapped };
});

it("読み込んだ曲の名前がリテラル型になる", () => {
  const [drums, keys] = song.tracks;
  const [room] = song.buses;
  expectTypeOf(song.title).toEqualTypeOf<"two five one">();
  expectTypeOf(drums.name).toEqualTypeOf<"drums">();
  expectTypeOf(room.name).toEqualTypeOf<"room">();
  expect(
    pipe(
      song.tracks,
      Arr.map((track) => track.name),
    ),
  ).toStrictEqual(["drums", "keys", "bass", "loop"]);
  expect(Option.isSome(keys.role)).toBe(true);
});

layer(NodeFileSystem.layer)("書き出した型宣言", (test) => {
  test.effect("content mapper の出力と同じ", () =>
    Effect.gen(function* compare() {
      const fileSystem = yield* FileSystem.FileSystem;
      const names = yield* fileSystem.readDirectory(FIXTURES);
      const pairs = yield* pipe(names, Arr.filter(Str.endsWith(EXTENSION)), (items) =>
        Effect.forEach(items, (name) => pairOf(`${FIXTURES}${name}`), { concurrency: 1 }),
      );
      expect(Arr.isReadonlyArrayNonEmpty(pairs)).toBe(true);
      for (const { written, mapped } of pairs) {
        expect(written).toStrictEqual(mapped);
      }
    }),
  );
});
