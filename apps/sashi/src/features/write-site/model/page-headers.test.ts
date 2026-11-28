import { describe, expect, test } from "vite-plus/test";

import { pageHeaders } from "./page-headers.ts";

describe("pageHeaders", () => {
  test("script も style も自分のファイルだけから読ませる", () => {
    expect(pageHeaders).toContain("style-src 'self';");
    expect(pageHeaders).toContain("default-src 'self';");
  });

  test("すべてのパスに当てる 1 つのルールにする", () => {
    expect(pageHeaders).toMatch(/^\/\*\n[^]*\n$/u);
  });
});
