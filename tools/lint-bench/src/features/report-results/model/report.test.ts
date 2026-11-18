import { describe, expect, it } from "vite-plus/test";

import { overlapOf } from "./report.ts";

describe("overlapOf", () => {
  it("counts a repeated key as many times as both sides report it", () => {
    expect(
      overlapOf({ own: ["a:1:x", "a:1:x", "b:2:y"], other: ["a:1:x", "c:3:z"] }),
    ).toStrictEqual({
      shared: 1,
      onlyOwn: 2,
      onlyThis: 1,
    });
  });
});
