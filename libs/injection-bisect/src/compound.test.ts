import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { compoundOf, utf16Of } from "./__tests__/compound.ts";
import { INJECTION, foundIn } from "./__tests__/fake-judge.ts";

const LITTLE_ENDIAN = true;

const START = 0;

const concat = (parts: readonly Uint8Array[]): Uint8Array =>
  Uint8Array.from(
    pipe(
      parts,
      Arr.flatMap((part) => [...part]),
    ),
  );

const u16 = (value: number): Uint8Array => {
  const view = new DataView(new ArrayBuffer(Uint16Array.BYTES_PER_ELEMENT));
  view.setUint16(START, value, LITTLE_ENDIAN);
  return new Uint8Array(view.buffer);
};

const u32 = (value: number): Uint8Array => {
  const view = new DataView(new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
  view.setUint32(START, value, LITTLE_ENDIAN);
  return new Uint8Array(view.buffer);
};

test("reads the sender, subject and body of an Outlook message", () =>
  Effect.runPromise(
    Effect.gen(function* outlook() {
      const bytes = compoundOf({
        "__substg1.0_0037001F": utf16Of("請求書"),
        "__substg1.0_0C1A001F": utf16Of("佐藤"),
        "__substg1.0_1000001F": utf16Of(`請求書を送ります。\n${INJECTION}`),
      });
      const { document, found, cleaned } = yield* foundIn({ bytes });
      expect(document.format).toBe("plain");
      expect(document.text).toContain("Subject: 請求書");
      expect(document.text).toContain("From: 佐藤");
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
      expect(cleaned).toContain("請求書を送ります。");
    }),
  ));

const TEXT_AT = 512;

const FC_CLX = 418;

const LCB_CLX = 422;

const PCDT = 2;

const NO_PROPERTIES = 0;

const docOf = (text: string): Uint8Array => {
  const fib = new DataView(new ArrayBuffer(TEXT_AT));
  const plc = concat([
    u32(START),
    u32(text.length),
    u16(NO_PROPERTIES),
    u32(TEXT_AT),
    u16(NO_PROPERTIES),
  ]);
  const clx = concat([Uint8Array.of(PCDT), u32(plc.length), plc]);
  fib.setUint32(FC_CLX, START, LITTLE_ENDIAN);
  fib.setUint32(LCB_CLX, clx.length, LITTLE_ENDIAN);
  return compoundOf({
    WordDocument: concat([new Uint8Array(fib.buffer), utf16Of(text)]),
    "0Table": clx,
  });
};

test("reads the text of a Word 97-2003 document without its field codes", () =>
  Effect.runPromise(
    Effect.gen(function* doc() {
      const { document, found } = yield* foundIn({
        bytes: docOf(
          `議事録です。\r\u0013 HYPERLINK "https://example.com" \u0014詳しくはリンクを参照。\u0015\r${INJECTION}\r`,
        ),
      });
      expect(document.text).toBe(`議事録です。\n詳しくはリンクを参照。\n${INJECTION}`);
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
    }),
  ));

const ATOM = { textChars: 4000, textBytes: 4008, document: 1000 } as const;

const VERSION = { atom: 0, container: 15 } as const;

const atomOf = (version: number, type: number, data: Uint8Array): Uint8Array =>
  concat([u16(version), u16(type), u32(data.length), data]);

test("reads the slide text of a PowerPoint 97-2003 file", () =>
  Effect.runPromise(
    Effect.gen(function* ppt() {
      const slide = concat([
        atomOf(VERSION.atom, ATOM.textChars, utf16Of("売上の報告")),
        atomOf(VERSION.atom, ATOM.textBytes, new TextEncoder().encode("Revenue grew.")),
        atomOf(VERSION.atom, ATOM.textChars, utf16Of(INJECTION)),
      ]);
      const { document, found } = yield* foundIn({
        bytes: compoundOf({
          "PowerPoint Document": atomOf(VERSION.container, ATOM.document, slide),
        }),
      });
      expect(document.text).toBe(`売上の報告\n\nRevenue grew.\n\n${INJECTION}`);
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
    }),
  ));
