import { expect, test } from "vite-plus/test";

import { format } from "./format.ts";
import { wismPathspecs, wismSection } from "./section.ts";

const UNOWNED = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
  ":(exclude,attr:linguist-documentation)",
];

test("reads the wism section of a vite config", () => {
  const section = { rules: { placement: "warn" } };
  expect(wismSection({ wism: section, test: {} })).toBe(section);
  expect(wismSection({ test: {} })).toStrictEqual({});
  expect(wismSection({ wism: "nope" })).toStrictEqual({});
  expect(wismSection("vite")).toStrictEqual({});
});

test("lists the whole repository without vendored, generated and ignored files", () => {
  expect(wismPathspecs({ config: {} })).toStrictEqual([".", ...UNOWNED]);
  expect(
    wismPathspecs({ config: { ignores: ["fixtures/**", "*.gen.ts"] }, patterns: ["libs", "apps"] }),
  ).toStrictEqual([
    "libs",
    "apps",
    ...UNOWNED,
    ":(glob,exclude)fixtures/**",
    ":(glob,exclude)*.gen.ts",
  ]);
});

test("formats a diagnostic on one line", () => {
  expect(
    format({
      path: "libs/kit/kit.ts",
      line: 2,
      column: 5,
      severity: "warn",
      rule: "placement",
      message: "sits outside src/.",
    }),
  ).toBe("libs/kit/kit.ts:2:5 warn placement sits outside src/.");
});
