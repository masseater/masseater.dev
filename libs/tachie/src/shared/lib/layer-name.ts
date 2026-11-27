import { Array as Arr, Option, String as Str, pipe } from "effect";

const FIRST_PRINTABLE = 32;
const DELETE = 127;
const ESCAPED_PRINTABLE = new Set(Arr.fromIterable(String.raw` "%'/[\]~`));
const HEX = 16;
const HEX_WIDTH = 2;
const NOTHING = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

const escapeChar = (char: string): string =>
  pipe(
    Str.codePointAt(NOTHING)(char),
    Option.filter(
      (code) => code < FIRST_PRINTABLE || code === DELETE || ESCAPED_PRINTABLE.has(char),
    ),
    Option.match({
      onNone: () => char,
      onSome: (code) => `%${pipe(code.toString(HEX), Str.padStart(HEX_WIDTH, "0"))}`,
    }),
  );

export const encodeLayerName = (name: string): string =>
  pipe(Arr.fromIterable(name), Arr.map(escapeChar), Arr.join(""));

export const decodeLayerName = (segment: string): Option.Option<string> =>
  Option.liftThrowable(decodeURIComponent)(segment);

export const normalizeLayerPath = (path: string): Option.Option<string> =>
  pipe(
    Str.split("/")(path),
    Arr.map(decodeLayerName),
    Option.all,
    Option.map((segments) => pipe(segments, Arr.map(encodeLayerName), Arr.join("/"))),
  );

const LEGACY_CHARS = [
  "―",
  "ソ",
  "Ы",
  "Ⅸ",
  "噂",
  "浬",
  "欺",
  "圭",
  "構",
  "蚕",
  "十",
  "申",
  "曾",
  "箪",
  "貼",
  "能",
  "表",
  "暴",
  "予",
  "禄",
  "兔",
  "喀",
  "媾",
  "彌",
  "拿",
  "杤",
  "歃",
  "濬",
  "畚",
  "秉",
  "綵",
  "臀",
  "藹",
  "觸",
  "軆",
  "鐔",
  "饅",
  "鷭",
  "纊",
  "犾",
  "偆",
  "砡",
] as const;
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BYTE_BITS = 8;
const BASE64_BITS = 6;
const BYTE_RANGE = 256;
const RUNE_PREFIXES = "tuvw";

const base64UrlBytes = (text: string): Option.Option<Uint8Array> =>
  pipe(
    Arr.fromIterable(text),
    Arr.map((char) => Str.indexOf(char)(BASE64URL)),
    Option.all,
    Option.map((values) => {
      const bits = pipe(
        values,
        Arr.map((value) => pipe(value.toString(TWO), Str.padStart(BASE64_BITS, "0"))),
        Arr.join(""),
      );
      return Uint8Array.from({ length: Math.floor(bits.length / BYTE_BITS) }, (_unused, index) =>
        Number.parseInt(Str.slice(index * BYTE_BITS, (index + ONE) * BYTE_BITS)(bits), TWO),
      );
    }),
  );

interface Unescaped {
  readonly char: string;
  readonly next: number;
}

const runeAt = (text: string, index: number): Option.Option<Unescaped> =>
  pipe(
    Str.charAt(index + ONE)(text),
    Option.flatMap((marker) => Str.indexOf(marker)(RUNE_PREFIXES)),
    Option.map((position) => Math.ceil(((position + ONE) * BYTE_BITS) / BASE64_BITS)),
    Option.filter((length) => index + ONE + length < text.length),
    Option.flatMap((length) =>
      pipe(
        base64UrlBytes(Str.slice(index + TWO, index + TWO + length)(text)),
        Option.map((bytes) => ({
          char: String.fromCodePoint(
            Arr.reduce(Arr.reverse(bytes), NOTHING, (rune, byte) => rune * BYTE_RANGE + byte),
          ),
          next: index + TWO + length,
        })),
      ),
    ),
  );

const legacyAt = (text: string, index: number): Option.Option<Unescaped> =>
  pipe(
    Str.charAt(index + TWO)(text),
    Option.flatMap((char) => Str.indexOf(char)(BASE64URL)),
    Option.flatMap((position) => Arr.get(LEGACY_CHARS, position)),
    Option.map((char) => ({ char, next: index + THREE })),
  );

const unescapeAt = (text: string, index: number): Unescaped => {
  const marker = Option.getOrElse(Str.charAt(index + ONE)(text), () => "");
  if (marker === "y") {
    return { char: "\\", next: index + TWO };
  }
  if (marker === "x") {
    return Option.getOrElse(legacyAt(text, index), () => ({ char: "%", next: index + ONE }));
  }
  return Option.getOrElse(runeAt(text, index), () => ({ char: "%", next: index + ONE }));
};

const stepAt = (text: string, index: number): Unescaped => {
  const char = Option.getOrElse(Str.charAt(index)(text), () => "");
  if (char === "%") {
    return unescapeAt(text, index);
  }
  return { char, next: index + ONE };
};

const unescapeState = (text: string): string => {
  const chars: string[] = [];
  let index = NOTHING;
  while (index < text.length) {
    const step = stepAt(text, index);
    chars.push(step.char);
    index = step.next;
  }
  return Arr.join(chars, "");
};

export const decodeStateValue = (value: string): Option.Option<string> => {
  if (value.length <= ONE) {
    return Option.some("");
  }
  const body = Str.slice(ONE)(value);
  if (Str.startsWith(".")(value)) {
    return Option.some(unescapeState(body));
  }
  if (Str.startsWith("_")(value)) {
    return Option.map(base64UrlBytes(body), (bytes) => new TextDecoder().decode(bytes));
  }
  return Option.none();
};
