import { BACKDROP_STYLE_HASH } from "@masseater.dev/ui/backdrop-palette";
import {
  WEB_ANALYTICS_BEACON,
  WEB_ANALYTICS_REPORT_ORIGIN,
} from "@masseater.dev/web-ui/web-analytics";
import { Array as Arr, Boolean as Bool, pipe } from "effect";

const WEB_ANALYTICS_SCRIPT_ORIGIN = new URL(WEB_ANALYTICS_BEACON.src).origin;

const OPENROUTER_ORIGIN = "https://openrouter.ai";

const NPM_CDN = "https://cdn.jsdelivr.net/npm/";

const CLIENT_COMPUTE = {
  scriptKeywords: ["'wasm-unsafe-eval'"],
  scriptOrigins: [NPM_CDN],
  worker: ["worker-src 'self' blob:"],
  connect: [OPENROUTER_ORIGIN, NPM_CDN],
} as const;

const NO_CLIENT_COMPUTE = {
  scriptKeywords: [],
  scriptOrigins: [],
  worker: [],
  connect: [],
} as const;

const contentSecurityPolicy = ({
  scriptHashes,
  clientCompute,
}: Readonly<{ scriptHashes: readonly string[]; clientCompute: boolean }>): string => {
  const extra = Bool.match(clientCompute, {
    onFalse: () => NO_CLIENT_COMPUTE,
    onTrue: () => CLIENT_COMPUTE,
  });
  return pipe(
    [
      "default-src 'self'",
      Arr.join(
        [
          "script-src 'self'",
          ...extra.scriptKeywords,
          WEB_ANALYTICS_SCRIPT_ORIGIN,
          ...extra.scriptOrigins,
          ...scriptHashes,
        ],
        " ",
      ),
      ...extra.worker,
      `style-src 'self' ${BACKDROP_STYLE_HASH}`,
      "style-src-attr 'unsafe-inline'",
      "img-src 'self' data: blob:",
      Arr.join(["connect-src 'self'", WEB_ANALYTICS_REPORT_ORIGIN, ...extra.connect], " "),
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );
};

export { contentSecurityPolicy };
