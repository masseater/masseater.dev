import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { twoFiveOne } from "./song.test.support.ts";
import { SongSchema } from "./song.ts";
import { readSong } from "./source.ts";

const encode = Schema.encodeEffect(Schema.fromJsonString(SongSchema, { space: 2 }));

const offsetsOf = (text: string): readonly number[] => {
  const read = readSong(text);
  if (read.status === "valid") {
    return [];
  }
  return pipe(
    read.issues,
    Arr.map((issue) => issue.offset),
  );
};

describe("readSong", () => {
  it.effect("reads a valid song", () =>
    Effect.gen(function* valid() {
      const text = yield* encode(twoFiveOne);
      expect(readSong(text).status).toBe("valid");
    }),
  );

  it.effect("points a schema issue at the value that broke it", () =>
    Effect.gen(function* broken() {
      const valid = yield* encode(twoFiveOne);
      const text = pipe(valid, Str.replace('"pitch": "D2"', '"pitch": "H2"'));
      expect(offsetsOf(text)).toStrictEqual([pipe(text, Str.indexOf('"H2"'), Option.getOrThrow)]);
    }),
  );

  it("rejects comments and trailing commas", () => {
    expect(readSong('{ "title": "x", }').status).toBe("invalid");
  });
});
