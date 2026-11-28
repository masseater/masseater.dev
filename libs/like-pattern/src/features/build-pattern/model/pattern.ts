import { Array as Arr, Option, String as Str, pipe } from "effect";

const PATTERN_BYTES = 50;

const WILDCARD_BYTES = 1;

const utf8 = new TextEncoder();

export const searchKeyOf = (text: string): string =>
  pipe(text, Str.replaceAll("%", "％"), Str.replaceAll("_", "＿"));

const prefixWithin =
  (bytes: number) =>
  (text: string): string =>
    pipe(
      searchKeyOf(text),
      Arr.fromIterable,
      Arr.scan("", (prefix: string, point: string) => prefix + point),
      Arr.filter((prefix) => utf8.encode(prefix).byteLength <= bytes),
      Arr.last,
      Option.getOrElse(() => ""),
    );

const containedPart = prefixWithin(PATTERN_BYTES - WILDCARD_BYTES - WILDCARD_BYTES);

const startingPart = prefixWithin(PATTERN_BYTES - WILDCARD_BYTES);

export const containingPattern = (text: string): string => `%${containedPart(text)}%`;

export const startingPattern = (text: string): string => `${startingPart(text)}%`;
