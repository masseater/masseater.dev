import { pipe, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { addonFileOf, platformTarget } from "./target.ts";

test("names the addon after the binary and the running platform", () => {
  expect(addonFileOf("y8")).toBe(`y8.${platformTarget}.node`);
  expect(pipe(platformTarget, Str.startsWith(`${process.platform}-${process.arch}`))).toBe(true);
});
