import { expect, test } from "vite-plus/test";

import { spokenOf } from "./narration.ts";

test("reads a command by its longest reading and drops the spaces", () => {
  expect(
    spokenOf({
      say: "導入はnpm install -g pnpm",
      readings: {
        pnpm: "ピーエヌピーエム",
        npm: "エヌピーエム",
        "npm install -g pnpm": "エヌピーエムインストールジーピーエヌピーエム",
      },
    }),
  ).toBe("導入はエヌピーエムインストールジーピーエヌピーエム");
});
