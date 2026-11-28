import { Array as Arr, Effect, pipe } from "effect";
import { SECURITY_HEADERS_CREDENTIALLESS, contentSecurityPolicy } from "security-headers";
import { headerLines, inlineScriptHashes, inlineStyleHashes } from "security-headers/static";

import { FONT_ORIGIN, FONT_STYLESHEET_ORIGIN } from "#/shared/config/index.ts";

export const pageHeaders = Effect.fn("holons.page-headers")(function* pageHeaders(html: string) {
  const script = yield* inlineScriptHashes(html);
  const style = yield* inlineStyleHashes(html);
  const policy = contentSecurityPolicy({
    script,
    style: [...style, FONT_STYLESHEET_ORIGIN],
    font: [FONT_ORIGIN],
    styleAttr: true,
  });
  return pipe(
    [
      "/*",
      ...headerLines(SECURITY_HEADERS_CREDENTIALLESS),
      `  Content-Security-Policy: ${policy}`,
      "",
    ],
    Arr.join("\n"),
  );
});
