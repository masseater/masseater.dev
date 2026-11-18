import { describe, expect, it } from "vite-plus/test";

import { matching } from "./findings.ts";

describe("matching", () => {
  it("keys every line that matches and skips the rest", () => {
    const keys = matching(/^(?<path>\S+?):(?<line>\d+)(?::\d+)? (?<rule>\S+)$/u);
    expect(keys("./a.md:3:7 MD013\nsummary line\nb.md:4 MD001\n")).toStrictEqual([
      "a.md:3:MD013",
      "b.md:4:MD001",
    ]);
  });
});
