import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

const ESCAPES: Readonly<Record<string, string>> = {
  "\u0007": String.raw`\a`,
  "\b": String.raw`\b`,
  "\f": String.raw`\f`,
  "\n": String.raw`\n`,
  "\r": String.raw`\r`,
  "\t": String.raw`\t`,
  "\v": String.raw`\v`,
  "\\": String.raw`\\`,
};
const ASCII_END = 0x80;
const BMP_END = 0x1_00_00;
const BYTE_DIGITS = 2;
const SHORT_DIGITS = 4;
const LONG_DIGITS = 8;
const HEX = 16;
const FIRST = 0;
const UNPRINTABLE = /[\p{Cc}\p{Z}\uFEFF\uFFF9-\uFFFB\uE000-\uF8FF\u2028\u2029]/u;
const SPACE = " ";
const SEPARATOR = ", ";

const hex = (code: number, digits: number): string => Str.padStart(digits, "0")(code.toString(HEX));

const unicodeEscape = (code: number): string => {
  if (code < ASCII_END) {
    return `\\x${hex(code, BYTE_DIGITS)}`;
  }
  if (code < BMP_END) {
    return `\\u${hex(code, SHORT_DIGITS)}`;
  }
  return `\\U${hex(code, LONG_DIGITS)}`;
};

const escapeChar =
  (delimiter: string) =>
  (character: string): string =>
    Option.getOrElse(Rec.get(ESCAPES, character), () => {
      if (character === delimiter) {
        return `\\${character}`;
      }
      if (character !== SPACE && UNPRINTABLE.test(character)) {
        return unicodeEscape(Option.getOrElse(Str.codePointAt(FIRST)(character), () => FIRST));
      }
      return character;
    });

export const codePoints = (text: string): readonly string[] => {
  const points: string[] = [];
  for (const point of text) {
    points.push(point);
  }
  return points;
};

const escaped = (text: string, delimiter: string): string =>
  pipe(codePoints(text), Arr.map(escapeChar(delimiter)), Arr.join(""));

export const quote = (text: string): string => `"${escaped(text, '"')}"`;

export const quoteChar = (character: string): string => `'${escaped(character, "'")}'`;

export const quotes = (items: readonly string[]): string =>
  pipe(items, Arr.map(quote), Arr.join(SEPARATOR));

export const sortedQuotes = (items: readonly string[]): string =>
  quotes(Arr.sort(items, Order.String));

const TEEN_START = 11;
const TEEN_END = 13;
const TEN = 10;
const HUNDRED = 100;
const SUFFIXES: Readonly<Record<string, string>> = { 1: "st", 2: "nd", 3: "rd" };

export const ordinal = (value: number): string => {
  const teen = value % HUNDRED >= TEEN_START && value % HUNDRED <= TEEN_END;
  if (teen) {
    return `${String(value)}th`;
  }
  return `${String(value)}${Option.getOrElse(Rec.get(SUFFIXES, String(value % TEN)), () => "th")}`;
};
