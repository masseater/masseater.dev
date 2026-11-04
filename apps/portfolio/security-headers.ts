import { BACKDROP_STYLE_HASH } from "@masseater.dev/ui/backdrop-palette";
import {
  WEB_ANALYTICS_REPORT_ORIGIN,
  WEB_ANALYTICS_SCRIPT_ORIGIN,
} from "@masseater.dev/ui/web-analytics";
import { Array as Arr, pipe } from "effect";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
} as const;

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

export { IMAGE_HEADERS, SECURITY_HEADERS, contentSecurityPolicy };
