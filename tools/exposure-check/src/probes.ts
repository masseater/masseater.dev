import { Array as Arr, Boolean as Bool, Option, String as Str, pipe } from "effect";

import type { Scene } from "./fingerprint.ts";
import type { Inventory } from "./inventory.ts";
import { WILDCARD, coveringApp, hostOf } from "./surface.ts";

export type ProbePurpose = "access" | "mcp" | "oauth-discovery";

export type Probe = Readonly<{
  purpose: ProbePurpose;
  subject: string;
  method: "GET" | "POST";
  url: string;
}>;

export type ProbeOutcome =
  | Readonly<{ _tag: "Answered"; status: number; location: string }>
  | Readonly<{ _tag: "Gone" }>
  | Readonly<{ _tag: "Unreachable"; reason: string }>;

export type ProbeResult = Readonly<{ probe: Probe; outcome: ProbeOutcome }>;

const MCP_PATH = "/mcp";
const OAUTH_DISCOVERY_PATH = "/.well-known/oauth-protected-resource";
const MCP_PORTAL = "mcp_portal";
export const MCP_LIST_TOOLS = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';

const ACCESS_LOGIN_SUFFIX = ".cloudflareaccess.com";
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const MOVED = 301;
const FOUND = 302;
const SEE_OTHER = 303;
const TEMPORARY_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;
export const OK = 200;
const REFUSED: readonly number[] = [UNAUTHORIZED, FORBIDDEN];
const REDIRECTS: readonly number[] = [
  MOVED,
  FOUND,
  SEE_OTHER,
  TEMPORARY_REDIRECT,
  PERMANENT_REDIRECT,
];

const inZones =
  (zones: readonly string[]) =>
  (host: string): boolean =>
    pipe(
      zones,
      Arr.some((zone) => host === zone || Str.endsWith(`.${zone}`)(host)),
    );

const accessProbes = (host: string, nonce: string): readonly Probe[] => [
  { purpose: "access", subject: host, method: "GET", url: `https://${host}/` },
  { purpose: "access", subject: host, method: "POST", url: `https://${host}/` },
  { purpose: "access", subject: host, method: "GET", url: `https://${host}/${nonce}` },
];

const mcpProbe = (url: string): Probe => ({ purpose: "mcp", subject: url, method: "POST", url });

const discoveryProbe = (host: string): Probe => ({
  purpose: "oauth-discovery",
  subject: host,
  method: "GET",
  url: `https://${host}${OAUTH_DISCOVERY_PATH}`,
});

const hostProbes =
  (inventory: Inventory, nonce: string) =>
  (host: string): readonly Probe[] => {
    const apps = coveringApp(inventory)(host);
    const portal = pipe(
      apps,
      Arr.some((app) => app.type === MCP_PORTAL),
    );
    const oauth = pipe(
      apps,
      Arr.some((app) => app.oauth),
    );
    return [
      ...Bool.match(portal, {
        onFalse: () => accessProbes(host, nonce),
        onTrue: () => [mcpProbe(`https://${host}${MCP_PATH}`)],
      }),
      ...Bool.match(oauth, {
        onFalse: (): readonly Probe[] => [],
        onTrue: () => [discoveryProbe(host)],
      }),
    ];
  };

const mcpServerProbes = (inventory: Inventory): readonly Probe[] =>
  pipe(
    inventory.mcpServers,
    Arr.map((server) => server.url),
    Arr.filter((url) => inZones(inventory.zones)(hostOf(Str.replace(/^https?:\/\//u, "")(url)))),
    Arr.dedupe,
    Arr.map(mcpProbe),
  );

export const planProbes = ({
  inventory,
  surface,
  nonce,
}: Scene & Readonly<{ nonce: string }>): readonly Probe[] => [
  ...pipe(
    surface.hosts,
    Arr.filter((host) => !Str.startsWith(WILDCARD)(host)),
    Arr.flatMap(hostProbes(inventory, nonce)),
  ),
  ...mcpServerProbes(inventory),
];

const redirectsToAccess = (location: string): boolean =>
  pipe(
    Option.liftThrowable(() => new URL(location))(),
    Option.exists((url) => Str.endsWith(ACCESS_LOGIN_SUFFIX)(url.hostname)),
  );

export const isRefused = ({
  status,
  location,
}: Readonly<{ status: number; location: string }>): boolean =>
  Arr.contains(REFUSED, status) || (Arr.contains(REDIRECTS, status) && redirectsToAccess(location));
