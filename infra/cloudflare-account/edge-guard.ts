import { AnalyticsEngine, Ruleset, Workers, Zone } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { adopt } from "alchemy/AdoptPolicy";
import { Array as Arr, Effect, Record as Rec, String as Str, pipe } from "effect";

import { SCANNER_PROBES } from "./scanner-probes.ts";

const HONEYPOT_PATHS = ["/.env", "/wp-login.php"] as const;

const PATH = "lower(http.request.uri.path)";

const quote = (value: string): string => `"${value}"`;

const SCANNER_CONDITIONS = {
  contains: [
    ...pipe(
      SCANNER_PROBES.contains,
      Arr.map((fragment) => `${PATH} contains ${quote(fragment)}`),
    ),
    `(${PATH} contains "/." and not starts_with(${PATH}, "/.well-known/"))`,
  ],
  startsWith: pipe(
    SCANNER_PROBES.startsWith,
    Arr.map((prefix) => `starts_with(${PATH}, ${quote(prefix)})`),
  ),
  endsWith: pipe(
    SCANNER_PROBES.endsWith,
    Arr.map((suffix) => `ends_with(${PATH}, ${quote(suffix)})`),
  ),
  equals: pipe(
    SCANNER_PROBES.equals,
    Arr.map((path) => `${PATH} eq ${quote(path)}`),
  ),
} as const;

const scannerRules = (domain: string): Ruleset.Rule[] => {
  const paths = Arr.join(
    pipe(
      HONEYPOT_PATHS,
      Arr.map((path) => quote(path)),
    ),
    " ",
  );
  const honeypot = `(http.host eq ${quote(domain)} and http.request.uri.path in {${paths}})`;
  return Arr.map(Rec.toEntries(SCANNER_CONDITIONS), ([kind, conditions]) => ({
    description: `Block vulnerability scanner probes (${kind})`,
    expression: `(${Arr.join(conditions, " or ")}) and not ${honeypot}`,
    action: "block",
  }));
};

type EdgeGuardProps = Readonly<{ appName: string; domain: string }>;

const honeypot = Effect.fn("honeypot")(function* honeypot({ appName, domain }: EdgeGuardProps) {
  const HONEYPOT = yield* AnalyticsEngine.Dataset("Honeypot", {
    dataset: `${Str.replaceAll("-", "_")(appName)}_honeypot`,
  });
  return yield* Workers.Worker("Honeypot", {
    name: `${appName}-honeypot`,
    main: decodeURIComponent(new URL("honeypot.worker.ts", import.meta.url).pathname),
    logpush: true,
    env: { HONEYPOT },
    routes: pipe(
      HONEYPOT_PATHS,
      Arr.map((path) => ({ pattern: `${domain}${path}`, zoneName: domain })),
    ),
  });
});

const edgeGuard = Effect.fn("edgeGuard")(function* edgeGuard(props: EdgeGuardProps) {
  const zone = yield* Zone.Zone("Zone", { name: props.domain }).pipe(adopt(true));
  yield* Ruleset.Ruleset("ScannerBlock", {
    zone,
    name: `${props.appName}-scanner-block`,
    phase: "http_request_firewall_custom",
    rules: scannerRules(props.domain),
  });
  return yield* honeypot(props);
});

type HoneypotEnv = InferEnv<ReturnType<typeof honeypot>>;

export type { EdgeGuardProps, HoneypotEnv };
export { edgeGuard };
