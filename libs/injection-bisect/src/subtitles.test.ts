import { Effect, String as Str, Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION, cleanedOf } from "./__tests__/fake-judge.ts";
import { sentencesOf } from "./segment.ts";

const textsOf = (text: string): readonly string[] =>
  pipe(
    sentencesOf({ text }),
    Arr.map(({ start, end }) => Str.slice(start, end)(text)),
  );

test("reads only the cue text and notes of WebVTT", () => {
  expect(
    textsOf(
      "WEBVTT\n\nNOTE 字幕の注記\n\n00:00:01.000 --> 00:00:03.000\nこんにちは。\n\nintro\n00:00:04.000 --> 00:00:06.000\n始めます。\n",
    ),
  ).toStrictEqual(["NOTE 字幕の注記", "こんにちは。", "始めます。"]);
});

test("finds and removes an injection in an SRT cue", () =>
  Effect.runPromise(
    Effect.gen(function* srt() {
      const text = `1\n00:00:01,000 --> 00:00:03,000\n今日の議題です。\n\n2\n00:00:04,000 --> 00:00:06,000\n${INJECTION}\n\n3\n00:00:07,000 --> 00:00:09,000\n以上です。\n`;
      const actual = yield* cleanedOf({ text });
      expect(actual).toStrictEqual({
        found: [INJECTION],
        cleaned: Str.replace(INJECTION, "")(text),
      });
    }),
  ));

test("splits cues on any line ending", () => {
  expect(
    textsOf(
      "WEBVTT\r\r00:00:01.000 --> 00:00:03.000\rこんにちは。\r\r00:00:04.000 --> 00:00:06.000\r始めます。\r",
    ),
  ).toStrictEqual(["こんにちは。", "始めます。"]);
});
