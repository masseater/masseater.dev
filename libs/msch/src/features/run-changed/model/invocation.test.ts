import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { invocationOf } from "./invocation.ts";

it("runs the whole command in one batch without the flag", () => {
  expect(invocationOf(["vp", "check"])).toStrictEqual(
    Option.some({ batchSources: Number.POSITIVE_INFINITY, command: ["vp", "check"] }),
  );
});

it("reads the batch size before the command", () => {
  expect(invocationOf(["--batch-sources", "1000", "vp", "check"])).toStrictEqual(
    Option.some({ batchSources: 1000, command: ["vp", "check"] }),
  );
});

it("rejects a batch size that is not a positive integer", () => {
  expect(invocationOf(["--batch-sources", "many", "vp", "check"])).toStrictEqual(Option.none());
  expect(invocationOf(["--batch-sources", "0", "vp", "check"])).toStrictEqual(Option.none());
  expect(invocationOf(["--batch-sources", "1.5", "vp", "check"])).toStrictEqual(Option.none());
});

it("rejects a batch size without a command", () => {
  expect(invocationOf(["--batch-sources", "1000"])).toStrictEqual(Option.none());
});
