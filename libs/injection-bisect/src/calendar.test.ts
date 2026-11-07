import { Effect, String as Str, Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION, cleanedOf } from "./__tests__/fake-judge.ts";
import { sentencesOf } from "./segment.ts";

const ITALIC = String.raw`{\i1}`;

const textsOf = (text: string): readonly string[] =>
  pipe(
    sentencesOf({ text }),
    Arr.map(({ start, end }) => Str.slice(start, end)(text)),
  );

test("reads the text properties of a calendar event, folded lines included", () => {
  expect(
    textsOf(
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:abc@example.com\r\nSUMMARY:定例 会議\r\nLOCATION;LANGUAGE=ja:第二会議室\r\nDESCRIPTION:資料は前日までに\r\n 共有してください。\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
    ),
  ).toStrictEqual(["定例 会議", "第二会議室", "資料は前日までに\r\n 共有してください。"]);
});

test("finds and removes an injection in a contact note", () =>
  Effect.runPromise(
    Effect.gen(function* vcard() {
      const text = `BEGIN:VCARD\nVERSION:4.0\nFN:佐藤 花子\nNOTE:${INJECTION}\nEND:VCARD\n`;
      const actual = yield* cleanedOf({ text });
      expect(actual).toStrictEqual({
        found: [INJECTION],
        cleaned: Str.replace(INJECTION, "")(text),
      });
    }),
  ));

test("reads the dialogue text of ASS subtitles", () =>
  Effect.runPromise(
    Effect.gen(function* ass() {
      const text = `[Script Info]\nTitle: 第1話\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,${ITALIC}こんにちは。\nDialogue: 0,0:00:04.00,0:00:06.00,Default,,0,0,0,,${INJECTION}\n`;
      expect(textsOf(text)).toStrictEqual(["第1話", `${ITALIC}こんにちは。`, INJECTION]);
      expect((yield* cleanedOf({ text })).found).toStrictEqual([INJECTION]);
    }),
  ));
