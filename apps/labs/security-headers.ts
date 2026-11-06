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

const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const contentSecurityPolicy = ({
  scriptSources,
  styleHashes,
}: Readonly<{ scriptSources: readonly string[]; styleHashes: readonly string[] }>): string =>
  pipe(
    [
      "default-src 'self'",
      Arr.join(["script-src 'self'", WEB_ANALYTICS_SCRIPT_ORIGIN, ...scriptSources], " "),
      Arr.join(["style-src 'self'", ...styleHashes], " "),
      "style-src-attr 'unsafe-inline'",
      "img-src 'self' data: blob:",
      `connect-src 'self' ${WEB_ANALYTICS_REPORT_ORIGIN}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );

export { ASSET_CACHE_CONTROL, SECURITY_HEADERS, contentSecurityPolicy };
