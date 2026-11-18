import { expect, test } from "vite-plus/test";

import { pathMatch, validatePath, validateRef } from "./index.ts";

const SPACE_COLUMN = 4;

test("reports ref errors with columns", () => {
  expect(validateRef("foo bar")).toStrictEqual([expect.objectContaining({ column: SPACE_COLUMN })]);
  expect(validateRef("release/**")).toStrictEqual([]);
  expect(validatePath("src/**/*.ts")).toStrictEqual([]);
  expect(validatePath("./src")).toStrictEqual([expect.objectContaining({ column: 0 })]);
});

test("matches paths with stars and classes", () => {
  expect(pathMatch("linux-*")("linux-arm")).toBe(true);
  expect(pathMatch("gpu-[0-9]")("gpu-3")).toBe(true);
  expect(pathMatch("gpu-[0-9]")("gpu-x")).toBe(false);
  expect(pathMatch("a/*")("a/b/c")).toBe(false);
});
