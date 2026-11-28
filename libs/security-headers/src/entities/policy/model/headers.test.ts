import { describe, expect, test } from "vite-plus/test";

import { contentSecurityPolicy } from "./headers.ts";

describe("contentSecurityPolicy", () => {
  test("font を渡すと、自分のオリジンに加えてその取得元から書体を読ませる", () => {
    expect(
      contentSecurityPolicy({ script: [], style: [], font: ["https://fonts.example"] }),
    ).toContain("; font-src 'self' https://fonts.example; ");
  });

  test("font を渡さないと font-src を書かず、default-src に任せる", () => {
    expect(contentSecurityPolicy({ script: [], style: [] })).not.toContain("font-src");
  });
});
