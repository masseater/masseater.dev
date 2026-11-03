import { BACKDROP_STYLE_HASH } from "@masseater.dev/ui/backdrop-palette";
import { Array as Arr, pipe } from "effect";

import { WEB_ANALYTICS_REPORT_ORIGIN, WEB_ANALYTICS_SCRIPT_ORIGIN } from "./web-analytics";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

const contentSecurityPolicy = (nonce: string): string =>
  pipe(
    [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' ${WEB_ANALYTICS_SCRIPT_ORIGIN} https://cdnjs.cloudflare.com`,
      `style-src 'self' 'nonce-${nonce}' ${BACKDROP_STYLE_HASH} https://fonts.googleapis.com`,
      "style-src-attr 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://i.ytimg.com https://upload.wikimedia.org https://thumb.wikimedia.org",
      "frame-src https://www.youtube-nocookie.com",
      `connect-src 'self' ${WEB_ANALYTICS_REPORT_ORIGIN}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );

export { SECURITY_HEADERS, contentSecurityPolicy };
