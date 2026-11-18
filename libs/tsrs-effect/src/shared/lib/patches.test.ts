import { describe, expect, it } from "vite-plus/test";

import { patchesOf } from "./patches.ts";

describe("patch order", () => {
  it("applies Effect's patches by name, skips the listed ones and prefers ours of the same name", () => {
    expect(
      patchesOf({
        theirs: ["180-lint.patch", "001-main.patch", "160-bolt.patch", "README.md"],
        ours: ["180-lint.patch"],
        skip: ["160-bolt.patch"],
      }),
    ).toStrictEqual([
      { name: "001-main.patch", ours: false },
      { name: "180-lint.patch", ours: true },
    ]);
  });
});
