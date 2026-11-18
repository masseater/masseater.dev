import { expect, test } from "vite-plus/test";

import { formatPlaceholders } from "./format-placeholders.ts";

const FIRST = 0;
const SECOND = 1;
const THIRD = 2;

const holders = (format: string): readonly number[] => [...formatPlaceholders(format)];

test("finds numbered placeholders", () => {
  expect(holders("{0} and {1}")).toStrictEqual([FIRST, SECOND]);
});

test("skips escaped braces", () => {
  expect(holders("{{0}}")).toStrictEqual([]);
  expect(holders("{{{0}}}")).toStrictEqual([FIRST]);
});

test("ignores non-numeric braces and counts multibyte text", () => {
  expect(holders("{x} {} あ{2}")).toStrictEqual([THIRD]);
});
