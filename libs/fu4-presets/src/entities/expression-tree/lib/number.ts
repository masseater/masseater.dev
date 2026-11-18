import { Option, String as Str, pipe } from "effect";

const HEX = 16;
const OCTAL = 8;
const HEX_DIGITS = /^[0-9a-fA-F]+$/u;
const OCTAL_DIGITS = /^[0-7]+$/u;
const DECIMAL = /^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)$/u;
const SIGNED = 0x80_00_00_00;
const WRAP = 0x1_00_00_00_00;
const MAX = 4_294_967_295;
const INFINITY = "infinity";
const PREFIX = 2;
const ZERO = 0;

const signed32 = (value: number): number => {
  if (value >= SIGNED) {
    return value - WRAP;
  }
  return value;
};

const radix = (digits: string, base: number, pattern: RegExp): number => {
  if (!pattern.test(digits)) {
    return Number.NaN;
  }
  const value = Number.parseInt(digits, base);
  if (value > MAX) {
    return Number.NaN;
  }
  return signed32(value);
};

const decimal = (text: string): Option.Option<number> =>
  pipe(
    Option.liftPredicate(text, (each) => DECIMAL.test(each)),
    Option.map(Number),
    Option.filter(Number.isFinite),
  );

const infinity = (text: string): number => {
  const unsigned = Str.replace(/^[+-]/u, "")(text);
  if (Str.toLowerCase(unsigned) !== INFINITY) {
    return Number.NaN;
  }
  if (Str.startsWith("-")(text)) {
    return Number.NEGATIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
};

const prefixed = (trimmed: string): number => {
  if (Str.startsWith("0x")(trimmed)) {
    return radix(Str.slice(PREFIX)(trimmed), HEX, HEX_DIGITS);
  }
  if (Str.startsWith("0o")(trimmed)) {
    return radix(Str.slice(PREFIX)(trimmed), OCTAL, OCTAL_DIGITS);
  }
  return infinity(trimmed);
};

export const parseNumber = (text: string): number => {
  const trimmed = Str.trim(text);
  if (Str.isEmpty(trimmed)) {
    return ZERO;
  }
  return Option.getOrElse(decimal(trimmed), () => prefixed(trimmed));
};
