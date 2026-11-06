import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { headerLines, sourceHash } from "./index.ts";

describe("headerLines", () => {
  test("ヘッダを _headers の字下げした行にする", () => {
    expect(headerLines({ "X-Frame-Options": "DENY", "Cache-Control": "no-store" })).toStrictEqual([
      "  X-Frame-Options: DENY",
      "  Cache-Control: no-store",
    ]);
  });
});

describe("sourceHash", () => {
  test("本文の SHA-256 を CSP のハッシュの書式で返す", () =>
    expect(Effect.runPromise(sourceHash(""))).resolves.toBe(
      "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
    ));
});
