import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { ASSET_CACHE_CONTROL, SECURITY_HEADERS } from "./index.ts";
import { headerLines, headersFileFor, inlineScriptHashes, pageSlug, sourceHash } from "./static.ts";
import type { PageHeaders } from "./static.ts";

const CSP = "Content-Security-Policy";
const FIRST_PAGE = 1;
const MOST_PAGES = 98;
const TOO_MANY_PAGES = 99;

const pagesOf = (count: number): readonly PageHeaders[] =>
  pipe(
    Arr.range(FIRST_PAGE, count),
    Arr.map((index) => ({ path: `/page/${index}/`, headers: { [CSP]: `sha256-${index}` } })),
  );

const headersFile = headersFileFor(["/assets/*"]);

describe("headerLines", () => {
  test("ヘッダを _headers の字下げした行にする", () => {
    expect(headerLines({ "X-Frame-Options": "DENY", "Cache-Control": "no-store" })).toStrictEqual([
      "  X-Frame-Options: DENY",
      "  Cache-Control: no-store",
    ]);
  });
});

describe("headersFileFor", () => {
  test("文書のルール、ページのルール、キャッシュのルールの順に並べ、末尾を改行で終える", () => {
    expect(
      Str.split(headersFile({ documentHeaders: { [CSP]: "default-src 'self'" }, pages: [] }), "\n"),
    ).toStrictEqual([
      "/*",
      ...headerLines(SECURITY_HEADERS),
      `  ${CSP}: default-src 'self'`,
      "/assets/*",
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ]);
  });

  test("ページのパスの下で、ヘッダを外してから付け直す", () => {
    expect(headersFile({ documentHeaders: {}, pages: pagesOf(FIRST_PAGE) })).toContain(
      `/page/1/\n  ! ${CSP}\n  ${CSP}: sha256-1\n`,
    );
  });

  test("100 個のルールは書き出す", () => {
    expect(headersFile({ documentHeaders: {}, pages: pagesOf(MOST_PAGES) })).toContain(
      "/page/98/\n",
    );
  });

  test("101 個のルールは Cloudflare が残りを捨てるので投げる", () => {
    expect(() => headersFile({ documentHeaders: {}, pages: pagesOf(TOO_MANY_PAGES) })).toThrow(
      new RangeError("_headers は 100 個までのルールしか持てない: 101"),
    );
  });
});

describe("sourceHash", () => {
  test("本文の SHA-256 を CSP のハッシュの書式で返す", () =>
    expect(Effect.runPromise(sourceHash(""))).resolves.toBe(
      "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
    ));
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
