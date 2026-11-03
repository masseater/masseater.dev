import { Array as Arr, pipe } from "effect";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const WEB_ANALYTICS_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";

const WEB_ANALYTICS_REPORT_ORIGIN = "https://cloudflareinsights.com";

const BEACON_VERSION = "v8c78df7c7c0f484497ecbca7046644da1771523124516";

const BEACON_INTEGRITY =
  "sha512-8DS7rgIrAmghBFwoOTujcf6D9rXvH8xm8JQ1Ja01h9QX8EzXldiszufYa4IFfKdLUKTTrnSFXLDkUEOTrZQ8Qg==";

const webAnalyticsBeacon = (token: string) =>
  ({
    src: `${WEB_ANALYTICS_SCRIPT_ORIGIN}/beacon.min.js/${BEACON_VERSION}`,
    integrity: BEACON_INTEGRITY,
    crossOrigin: "anonymous",
    defer: true,
    "data-cf-beacon": JSON.stringify({ token }),
  }) as const;

const contentSecurityPolicy = (scriptHashes: readonly string[]): string =>
  pipe(
    [
      "default-src 'self'",
      Arr.join(["script-src 'self'", WEB_ANALYTICS_SCRIPT_ORIGIN, ...scriptHashes], " "),
      "style-src 'self'",
      "img-src 'self' data: blob:",
      `connect-src 'self' ${WEB_ANALYTICS_REPORT_ORIGIN}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );

export { ASSET_CACHE_CONTROL, SECURITY_HEADERS, contentSecurityPolicy, webAnalyticsBeacon };
