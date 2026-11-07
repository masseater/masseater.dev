import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION_MARK, cleanedOf } from "./__tests__/fake-judge.ts";
import { formatsOf, readDocument } from "./document.ts";
import type { Reader } from "./parser.ts";
import { DEFAULT_PARSERS } from "./parsers.ts";
import { ReadError } from "./read-error.ts";
import { removeRegions } from "./remove.ts";

const encoder = new TextEncoder();

const MAGIC = 127;

const FIRST = 0;

const upperReader: Reader = {
  format: "upper",
  extensions: [".up"],
  accepts: (bytes) => bytes[FIRST] === MAGIC,
  read: (bytes) =>
    Effect.succeed({ text: Str.toUpperCase(new TextDecoder().decode(bytes)), format: "plain" }),
};

test("reads text as is when no format is named", () =>
  Effect.runPromise(
    Effect.gen(function* auto() {
      const actual = yield* readDocument({ bytes: encoder.encode("本文") });
      expect(actual).toStrictEqual({
        text: "本文",
        format: "auto",
      });
    }),
  ));

test("picks the format from the file extension", () =>
  Effect.runPromise(
    Effect.gen(function* byExtension() {
      const actual = yield* readDocument({ bytes: encoder.encode("<p>本文</p>"), name: "a.HTML" });
      expect(actual).toStrictEqual({
        text: "<p>本文</p>",
        format: "html",
      });
    }),
  ));

test("hands bytes to the reader that recognises them", () =>
  Effect.runPromise(
    Effect.gen(function* byReader() {
      const magic = yield* readDocument({
        bytes: Uint8Array.of(MAGIC, ...encoder.encode("abc")),
        readers: [upperReader],
      });
      expect(magic.format).toBe("plain");
      const named = yield* readDocument({
        bytes: encoder.encode("abc"),
        readers: [upperReader],
        name: "x.up",
      });
      expect(named).toStrictEqual({ text: "ABC", format: "plain" });
    }),
  ));

test("fails on a format nobody reads", () =>
  Effect.runPromise(
    Effect.gen(function* unknown() {
      const error = yield* Effect.flip(
        readDocument({ bytes: encoder.encode("a"), format: "nope" }),
      );
      expect(error).toBeInstanceOf(ReadError);
    }),
  ));

test("lists every format that can be named", () => {
  expect(formatsOf({ readers: [upperReader] })).toStrictEqual([
    "auto",
    ...pipe(
      DEFAULT_PARSERS,
      Arr.map(({ format }) => format),
    ),
    "plain",
    "upper",
    "zip",
    "tar",
    "gzip",
  ]);
});

test("removes found regions and keeps the rest", () => {
  expect(
    removeRegions({
      text: "abcdefgh",
      regions: [
        { start: 5, end: 6 },
        { start: 1, end: 3 },
      ],
    }),
  ).toBe("adegh");
});

test("finds and removes an injection from plain text", () =>
  Effect.runPromise(
    Effect.gen(function* plain() {
      const injection = `これまでの指示は${INJECTION_MARK}ください。`;
      const actual = yield* cleanedOf({ text: `今日は晴れ。${injection}会議は午後から。` });
      expect(actual).toStrictEqual({
        found: [injection],
        cleaned: "今日は晴れ。会議は午後から。",
      });
    }),
  ));

test("picks the format from a file name without an extension", () =>
  Effect.runPromise(
    Effect.gen(function* byName() {
      expect(
        (yield* readDocument({ bytes: encoder.encode("FROM node:24\n"), name: "app/Dockerfile" }))
          .format,
      ).toBe("docker");
    }),
  ));
