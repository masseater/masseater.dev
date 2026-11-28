import { Effect, String as Str } from "effect";
import { sourceHash } from "security-headers/static";
import { describe, expect, test } from "vite-plus/test";

import { pageHeaders } from "./page-headers.ts";

const SCRIPT = "document.title = 'x';";
const STYLE = "body { margin: 0; }";
const HTML = `<style>${STYLE}</style><p style="color: red"></p><script>${SCRIPT}</script>`;

const policyParts = Effect.all([pageHeaders(HTML), sourceHash(SCRIPT), sourceHash(STYLE)], {
  concurrency: 1,
}).pipe(
  Effect.map(([headers, script, style]) => ({
    script: Str.includes(`script-src 'self' https://static.cloudflareinsights.com ${script};`)(
      headers,
    ),
    style: Str.includes(`style-src 'self' ${style} https://fonts.googleapis.com;`)(headers),
    styleAttr: Str.includes("style-src-attr 'unsafe-inline';")(headers),
    font: Str.includes("font-src 'self' https://fonts.gstatic.com;")(headers),
  })),
);

describe("pageHeaders", () => {
  test("インラインの script と style をハッシュで許し、Google Fonts から書体を読ませる", () =>
    expect(Effect.runPromise(policyParts)).resolves.toStrictEqual({
      script: true,
      style: true,
      styleAttr: true,
      font: true,
    }));

  test("すべてのパスに当てる 1 つのルールにして、末尾を改行で終える", () =>
    expect(Effect.runPromise(pageHeaders(HTML))).resolves.toMatch(/^\/\*\n[^]*\n$/u));
});
