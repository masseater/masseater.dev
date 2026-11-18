import { Option, String as Str } from "effect";

import { parseGoFloat, quote } from "#/shared/text/index.ts";

const BOOLEANS = new Set(["true", "false"]);

export const floatError = (text: string): Option.Option<string> =>
  Option.match(parseGoFloat(text), {
    onNone: () => Option.some(`strconv.ParseFloat: parsing ${quote(text)}: invalid syntax`),
    onSome: () => Option.none(),
  });

export const isBoolean = (text: string): boolean => BOOLEANS.has(Str.toLowerCase(text));
