import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { headerLines, inlineScriptHashes, pageRule, pageSlug, sourceHash } from "./static.ts";

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

describe("pageRule", () => {
  test("ページのパスの下で、ヘッダを外してから付け直す", () => {
    expect(pageRule({ path: "/a", headers: { "Content-Security-Policy": "x" } })).toStrictEqual([
      "/a",
      "  ! Content-Security-Policy",
      "  Content-Security-Policy: x",
    ]);
  });
});

describe("pageSlug", () => {
  test("index.html と拡張子を落とす", () => {
    expect([pageSlug("index.html"), pageSlug("a/index.html"), pageSlug("a/b.html")]).toStrictEqual([
      "",
      "a/",
      "a/b",
    ]);
  });
});

describe("inlineScriptHashes", () => {
  test("src の無い script の本文だけを、重複を除いてハッシュにする", () =>
    expect(
      Effect.runPromise(
        inlineScriptHashes('<script></script><script src="/a.js"></script><script></script>'),
      ),
    ).resolves.toStrictEqual(["'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"]));
});
