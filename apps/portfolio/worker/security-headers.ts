import { BACKDROP_STYLE_HASH } from "@masseater.dev/ui/backdrop-palette";
import { WEB_ANALYTICS_SCRIPT_ORIGIN } from "@masseater.dev/ui/web-analytics";
import { Array as Arr, pipe } from "effect";
import { WEB_ANALYTICS_REPORT_ORIGIN } from "security-headers";

const IMAGE_HEADERS = { "Cross-Origin-Resource-Policy": "cross-origin" } as const;

const contentSecurityPolicy = (nonce: string): string =>
  pipe(
    [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' ${WEB_ANALYTICS_SCRIPT_ORIGIN}`,
      `style-src 'self' 'nonce-${nonce}' ${BACKDROP_STYLE_HASH} https://fonts.googleapis.com`,
      "style-src-attr 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://i.ytimg.com https://upload.wikimedia.org https://thumb.wikimedia.org",
      `connect-src 'self' ${WEB_ANALYTICS_REPORT_ORIGIN}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );

export { IMAGE_HEADERS, contentSecurityPolicy };
export { SECURITY_HEADERS_CREDENTIALLESS as SECURITY_HEADERS } from "security-headers";
