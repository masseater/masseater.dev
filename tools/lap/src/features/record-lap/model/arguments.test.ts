import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { invocationOf } from "./arguments.ts";

test("reads the name and the command around the separator", () => {
  expect(invocationOf(["pre-push", "--", "vp", "run", "verify"])).toStrictEqual(
    Option.some({ name: "pre-push", command: ["vp", "run", "verify"] }),
  );
});

test("rejects a call without a separator or without a command", () => {
  expect(Option.isNone(invocationOf(["pre-push", "vp", "run"]))).toBe(true);
  expect(Option.isNone(invocationOf(["pre-push", "--"]))).toBe(true);
});
