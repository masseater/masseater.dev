import { Option, String as Str, pipe } from "effect";

const ZERO = 0;
const EXPONENT_ABOVE = 1e21;
const EXPONENT_BELOW = 1e-4;
const SIGNS = /^[+-]*/u;
const FLOAT_CHARS = /^[\d.eE+-]+$/u;
const INFINITE = new Set(["inf", "infinity"]);
const DIGITS = /^[+-]?\d+$/u;
const MAX_SIGNS = 1;
const INT64_MIN = BigInt("-9223372036854775808");
const INT64_MAX = 9_223_372_036_854_775_807n;

const nonFinite = (value: number): string => {
  if (Number.isNaN(value)) {
    return "NaN";
  }
  if (value < ZERO) {
    return "-inf";
  }
  return "inf";
};

export const goFloat = (value: number): string => {
  if (!Number.isFinite(value)) {
    return nonFinite(value);
  }
  if (Number.isInteger(value) && Math.abs(value) < EXPONENT_ABOVE) {
    return value.toFixed(ZERO);
  }
  if (Math.abs(value) >= EXPONENT_ABOVE || (value !== ZERO && Math.abs(value) < EXPONENT_BELOW)) {
    return value.toExponential();
  }
  return String(value);
};

const infinite = (text: string): number => {
  if (Str.startsWith("-")(text)) {
    return Number.NEGATIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
};

const special = (text: string): Option.Option<number> => {
  const lower = pipe(text, Str.replace(SIGNS, ""), Str.toLowerCase);
  if (INFINITE.has(lower)) {
    return Option.some(infinite(text));
  }
  if (lower === "nan") {
    return Option.some(Number.NaN);
  }
  return Option.none();
};

const plainFloat = (text: string): Option.Option<number> => {
  const body = Str.replace(SIGNS, "")(text);
  const hex = pipe(body, Str.toLowerCase, Str.startsWith("0x"));
  if (
    text.length - body.length > MAX_SIGNS ||
    Str.includes("_")(text) ||
    hex ||
    !FLOAT_CHARS.test(body)
  ) {
    return Option.none();
  }
  return Option.liftPredicate(Number(text), (value) => !Number.isNaN(value));
};

export const parseGoFloat = (text: string): Option.Option<number> =>
  Option.orElse(special(text), () => plainFloat(text));

export type Atoi = number | "invalid syntax" | "value out of range";

export const atoi = (text: string): Atoi => {
  if (!DIGITS.test(text)) {
    return "invalid syntax";
  }
  const value = BigInt(text);
  if (value < INT64_MIN || value > INT64_MAX) {
    return "value out of range";
  }
  return Number(value);
};
