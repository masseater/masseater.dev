import { Option, String as Str } from "effect";

import { quote } from "#/shared/text/index.ts";

const INT32_MIN = BigInt("-2147483648");
const INT32_MAX = 2_147_483_647n;
const HEX = /^0x[\dA-Fa-f]+$/u;
const OCTAL = /^0[0-7]+$/u;
const DECIMAL = /^(?:0|[1-9]\d*)$/u;
const I128_MAX = 170_141_183_460_469_231_731_687_303_715_884_105_727n;
const NEGATIVE = "-";
const OCTAL_PREFIX = "0o";

const magnitudeOf = (body: string): Option.Option<bigint> => {
  if (HEX.test(body)) {
    return Option.some(BigInt(body));
  }
  if (OCTAL.test(body)) {
    return Option.some(BigInt(Str.replace(/^0/u, OCTAL_PREFIX)(body)));
  }
  if (DECIMAL.test(body)) {
    return Option.some(BigInt(body));
  }
  return Option.none();
};

const fits = (magnitude: bigint): boolean => magnitude <= I128_MAX;

const signed = (text: string, magnitude: bigint): bigint => {
  if (Str.startsWith(NEGATIVE)(text)) {
    return -magnitude;
  }
  return magnitude;
};

export const intLiteralError = (text: string): Option.Option<string> => {
  const body = Str.replace(/^-/u, "")(text);
  const magnitude = Option.filter(magnitudeOf(body), fits);
  if (Option.isNone(magnitude)) {
    return Option.some(`strconv.ParseInt: parsing ${quote(text)}: invalid syntax`);
  }
  const value = signed(text, magnitude.value);
  if (value < INT32_MIN || value > INT32_MAX) {
    return Option.some(`strconv.ParseInt: parsing ${quote(text)}: value out of range`);
  }
  return Option.none();
};
