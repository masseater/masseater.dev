import { Array as Arr, Effect, Schema, pipe } from "effect";

import { FONT } from "#/shared/config/index.ts";

const taggedError = Schema.TaggedError;

export class FontError extends taggedError<FontError, { readonly brand: unique symbol }>()(
  "FontError",
  {
    face: Schema.String,
    reason: Schema.Unknown,
  },
) {}

const FACES = [
  `900 64px "${FONT.heavy}"`,
  `700 64px "${FONT.bold}"`,
  `500 64px "${FONT.code}"`,
] as const;

const ASCII_FIRST = 32;
const ASCII_LAST = 126;
const KANA_FIRST = 12_288;
const KANA_LAST = 12_543;
const KANJI_FIRST = 19_968;
const KANJI_LAST = 40_959;
const WIDE_FIRST = 65_280;
const WIDE_LAST = 65_519;
const SYMBOL_FIRST = 9728;
const SYMBOL_LAST = 10_175;
const RANGES: readonly (readonly [number, number])[] = [
  [ASCII_FIRST, ASCII_LAST],
  [KANA_FIRST, KANA_LAST],
  [KANJI_FIRST, KANJI_LAST],
  [WIDE_FIRST, WIDE_LAST],
  [SYMBOL_FIRST, SYMBOL_LAST],
];

const EVERY_GLYPH = pipe(
  RANGES,
  Arr.flatMap(([first, last]) => Arr.range(first, last)),
  Arr.map((code) => String.fromCodePoint(code)),
  Arr.join(""),
);

const loadFace = (face: string): Effect.Effect<readonly FontFace[], FontError> =>
  Effect.tryPromise({
    try: () => document.fonts.load(face, EVERY_GLYPH),
    catch: (reason) => FontError.make({ face, reason }),
  });

export const loadFonts: Effect.Effect<readonly (readonly FontFace[])[], FontError> = Effect.forEach(
  FACES,
  loadFace,
  { concurrency: "unbounded" },
);
