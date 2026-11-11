import { describe, expect, it } from "@effect/vitest";

import { isFiller } from "./filler.ts";

describe("isFiller", () => {
  it("treats hesitation alone as not an answer", () => {
    expect(isFiller("えーっと、うーん…")).toBe(true);
    expect(isFiller("なんだろう")).toBe(true);
    expect(isFiller(" ")).toBe(true);
  });

  it("keeps anything with content", () => {
    expect(isFiller("えっと、電車で帰ってる")).toBe(false);
    expect(isFiller("あのアプリ")).toBe(false);
  });
});
