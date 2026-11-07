import { Effect, Array as Arr, String as Str, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { cleanedOf } from "./__tests__/fake-judge.ts";
import { LINES, SAVED, documentOf, spreadsheetOf } from "./__tests__/office.ts";
import { readDocument } from "./document.ts";

const [TEXT, INJECTION] = LINES;

const SLIDE = "売上報告";

const FILES = {
  docx: { bytes: documentOf("docx"), kept: TEXT },
  odt: { bytes: documentOf("odt"), kept: TEXT },
  rtf: { bytes: documentOf("rtf"), kept: TEXT },
  epub: { bytes: documentOf("epub"), kept: TEXT },
  doc: { bytes: Effect.succeed(SAVED.doc), kept: TEXT },
  xls: { bytes: spreadsheetOf("biff8"), kept: TEXT },
  xlsx: { bytes: spreadsheetOf("xlsx"), kept: TEXT },
  xlsb: { bytes: spreadsheetOf("xlsb"), kept: TEXT },
  ods: { bytes: spreadsheetOf("ods"), kept: TEXT },
  pptx: { bytes: Effect.succeed(SAVED.pptx), kept: SLIDE },
  odp: { bytes: Effect.succeed(SAVED.odp), kept: SLIDE },
};

test.each(Rec.toEntries(FILES))(
  "finds and removes an injection in a %s file",
  (format, { bytes, kept }) =>
    Effect.runPromise(
      Effect.gen(function* office() {
        const document = yield* readDocument({ bytes: yield* bytes, name: `a.${format}` });
        const { found, cleaned } = yield* cleanedOf(document);
        expect(
          pipe(
            found,
            Arr.map((text) => pipe(text, Str.replaceAll('"', ""), Str.trim)),
          ),
        ).toStrictEqual([INJECTION]);
        expect(cleaned).toContain(kept);
      }),
    ),
);
