import { Array as Arr, Option, Record as Rec, pipe } from "effect";

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

const SECURITY_HEADERS_CREDENTIALLESS = {
  ...SECURITY_HEADERS,
  "Cross-Origin-Embedder-Policy": "credentialless",
} as const;

const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const WEB_ANALYTICS_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";

const WEB_ANALYTICS_REPORT_ORIGIN = "https://cloudflareinsights.com";

const workerDirective = (worker: readonly string[] | undefined): readonly string[] =>
  Arr.fromOption(
    Option.map(Option.fromNullishOr(worker), (sources) =>
      pipe(["worker-src 'self'", ...sources], Arr.join(" ")),
    ),
  );

const contentSecurityPolicy = ({
  script,
  style,
  worker,
  image = [],
  styleAttr = false,
}: Readonly<{
  script: readonly string[];
  style: readonly string[];
  worker?: readonly string[];
  image?: readonly string[];
  styleAttr?: boolean;
}>): string =>
  pipe(
    [
      "default-src 'self'",
      pipe(["script-src 'self'", WEB_ANALYTICS_SCRIPT_ORIGIN, ...script], Arr.join(" ")),
      pipe(["style-src 'self'", ...style], Arr.join(" ")),
      ...Arr.fromOption(Option.liftPredicate("style-src-attr 'unsafe-inline'", () => styleAttr)),
      ...workerDirective(worker),
      pipe(["img-src 'self' data:", ...image], Arr.join(" ")),
      `connect-src 'self' ${WEB_ANALYTICS_REPORT_ORIGIN}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );

const STATIC_PAGE_HEADERS = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy": contentSecurityPolicy({
    script: ["'wasm-unsafe-eval'"],
    style: [],
    worker: ["blob:"],
  }),
} as const;

const assetHeaders = ({
  page,
  base = "",
}: Readonly<{ page: Readonly<Record<string, string>>; base?: string }>): string =>
  pipe(
    [
      `${base}/*`,
      ...pipe(
        Rec.toEntries(page),
        Arr.map(([name, value]) => `  ${name}: ${value}`),
      ),
      `${base}/assets/*`,
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ],
    Arr.join("\n"),
  );

export {
  ASSET_CACHE_CONTROL,
  WEB_ANALYTICS_REPORT_ORIGIN,
  WEB_ANALYTICS_SCRIPT_ORIGIN,
  SECURITY_HEADERS,
  SECURITY_HEADERS_CREDENTIALLESS,
  STATIC_PAGE_HEADERS,
  assetHeaders,
  contentSecurityPolicy,
};
