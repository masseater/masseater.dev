import { describe, expect, test } from "vite-plus/test";

import { pageHeaders } from "./page-headers.ts";

describe("pageHeaders", () => {
  test("script も style も自分のファイルだけから読ませる", () => {
    expect(pageHeaders).toContain("style-src 'self';");
    expect(pageHeaders).toContain("default-src 'self';");
  });

  test("他サイトのサムネ画像だけは https から読ませる", () => {
    expect(pageHeaders).toContain("img-src 'self' data: https:;");
  });

  test("他サイトの画像を読めるよう COEP を credentialless にする", () => {
    expect(pageHeaders).toContain("! Cross-Origin-Embedder-Policy");
    expect(pageHeaders).toContain("Cross-Origin-Embedder-Policy: credentialless");
  });
});
