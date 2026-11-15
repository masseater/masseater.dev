import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { fingerprint, planProbes, privateSurface } from "#/entities/exposure/index.ts";
import type {
  Inventory,
  Probe,
  ProbeOutcome,
  ProbePurpose,
  Surface,
} from "#/entities/exposure/index.ts";

import { findExposures } from "./findings.ts";

type Answers = Partial<Record<ProbePurpose, ProbeOutcome>>;

const NONCE = "nonce";
const NOTHING: Surface = { hosts: [], workers: [], repositories: [] };
const OWNER = { name: "owner", decision: "allow", include: ["email"] };
const LOGIN = "https://team.cloudflareaccess.com/cdn-cgi/access/login";
const REFUSED: ProbeOutcome = { _tag: "Answered", status: 302, location: LOGIN };
const OPEN: ProbeOutcome = { _tag: "Answered", status: 200, location: "" };
const UNAUTHORIZED: ProbeOutcome = { _tag: "Answered", status: 401, location: "" };
const GONE: ProbeOutcome = { _tag: "Gone" };
const DOWN: ProbeOutcome = { _tag: "Unreachable", reason: "timeout" };
const GUARDED: Answers = { access: REFUSED, mcp: REFUSED, "oauth-discovery": OPEN };

const base: Inventory = {
  zones: ["masseater.dev"],
  workersSubdomain: "owner",
  apps: [
    {
      name: "kikite",
      type: "self_hosted",
      destinations: ["kikite.masseater.dev"],
      publicPaths: [],
      policies: [OWNER],
      oauth: true,
    },
    {
      name: "portal",
      type: "mcp_portal",
      destinations: ["mcp.masseater.dev"],
      publicPaths: [],
      policies: [OWNER],
      oauth: false,
    },
  ],
  scripts: [
    { name: "kikite", workersDev: false, previews: false, storage: ["d1:private"] },
    { name: "site", workersDev: true, previews: true, storage: ["d1:stars"] },
  ],
  domains: [
    { hostname: "kikite.masseater.dev", service: "kikite" },
    { hostname: "masseater.dev", service: "site" },
  ],
  routes: [],
  buckets: [{ name: "logs", devUrl: false, customDomains: [] }],
  records: [{ name: "kikite.masseater.dev", type: "AAAA", content: "100::", proxied: true }],
  mcpServers: [],
  pages: [],
  repositories: [
    { id: "1", name: "owner/secret", private: true },
    { id: "2", name: "owner/site", private: false },
  ],
};

const seen = privateSurface({ inventory: base, remembered: NOTHING });

const withoutKikiteApp: Inventory = {
  ...base,
  apps: pipe(
    base.apps,
    Arr.filter((app) => app.name !== "kikite"),
  ),
};

type Case = Readonly<{
  inventory: Inventory;
  answers?: Answers;
  remembered?: Surface;
  override?: (probe: Probe) => Option.Option<ProbeOutcome>;
}>;

const outcomeOf =
  ({ answers = {}, override = () => Option.none() }: Case): ((probe: Probe) => ProbeOutcome) =>
  (probe: Probe): ProbeOutcome =>
    Option.getOrElse(
      override(probe),
      () => answers[probe.purpose] ?? GUARDED[probe.purpose] ?? REFUSED,
    );

const found = (scenario: Case): readonly string[] => {
  const { inventory, remembered = NOTHING } = scenario;
  const surface = privateSurface({ inventory, remembered });
  const probes = pipe(
    planProbes({ inventory, surface, nonce: NONCE }),
    Arr.map((probe) => ({ probe, outcome: outcomeOf(scenario)(probe) })),
  );
  return pipe(findExposures({ inventory, surface, probes }), Arr.map(fingerprint));
};

test("Access が全部を断り、抜け道も無ければ何も見つけない", () => {
  expect(found({ inventory: base })).toStrictEqual([]);
});

test("Access の背後のホストを、Access のアプリと同じホストから探る", () => {
  const planned = pipe(
    planProbes({ inventory: base, surface: seen, nonce: NONCE }),
    Arr.map((probe) => `${probe.method} ${probe.url}`),
  );
  expect(planned).toStrictEqual([
    "GET https://kikite.masseater.dev/",
    "POST https://kikite.masseater.dev/",
    "GET https://kikite.masseater.dev/nonce",
    "GET https://kikite.masseater.dev/.well-known/oauth-protected-resource",
    "POST https://mcp.masseater.dev/mcp",
  ]);
});

test("認証なしで中身を返すホストを見つける", () => {
  const leaking = found({
    inventory: base,
    override: (probe) =>
      Option.liftPredicate(OPEN, () => probe.url === `https://kikite.masseater.dev/${NONCE}`),
  });
  expect(leaking).toStrictEqual(["open-host:kikite.masseater.dev"]);
});

test("認証なしで tools/list に答える MCP を見つける", () => {
  expect(found({ inventory: base, answers: { mcp: OPEN } })).toStrictEqual([
    "open-mcp:https://mcp.masseater.dev/mcp",
  ]);
});

test("消えた Access のアプリを、前に見たホストの記録から見つける", () => {
  const removed = found({
    inventory: withoutKikiteApp,
    remembered: seen,
    answers: { access: OPEN },
  });
  expect(removed).toStrictEqual([
    "access-missing:kikite.masseater.dev",
    "open-host:kikite.masseater.dev",
    "unprotected-entrypoint:kikite.masseater.dev",
  ]);
});

test("DNS ごと消えたホストは開いていると数えない", () => {
  const gone: Inventory = {
    ...withoutKikiteApp,
    domains: pipe(
      base.domains,
      Arr.filter((domain) => domain.service !== "kikite"),
    ),
    records: [],
  };
  expect(found({ inventory: gone, remembered: seen, answers: { access: GONE } })).toStrictEqual([]);
});

test("Access の背後の Worker の別の入口を見つける", () => {
  const exposed: Inventory = {
    ...base,
    scripts: [{ name: "kikite", workersDev: true, previews: true, storage: [] }],
    routes: [{ pattern: "kikite.example.com/*", script: "kikite" }],
  };
  expect(found({ inventory: exposed })).toStrictEqual([
    "preview-urls:kikite",
    "unprotected-entrypoint:kikite.example.com/*",
    "workers-dev:kikite",
  ]);
});

test("外から届く Worker が Access の背後と同じ D1 を持つと見つける", () => {
  const sharing: Inventory = {
    ...base,
    scripts: [
      { name: "kikite", workersDev: false, previews: false, storage: ["d1:private"] },
      { name: "site", workersDev: false, previews: false, storage: ["d1:private"] },
    ],
  };
  expect(found({ inventory: sharing })).toStrictEqual(["shared-storage:site/d1:private"]);
});

const loosened = (app: Inventory["apps"][number]): Inventory["apps"][number] =>
  Option.getOrElse(
    Option.liftPredicate(
      {
        ...app,
        publicPaths: ["/api/*"],
        policies: [
          OWNER,
          { name: "anyone", decision: "allow", include: ["everyone"] },
          { name: "bypass", decision: "bypass", include: ["email"] },
        ],
      },
      () => app.name === "kikite",
    ),
    () => app,
  );

test("持ち主以外を通すポリシーと、認証を外したパスを見つける", () => {
  const loose: Inventory = { ...base, apps: pipe(base.apps, Arr.map(loosened)) };
  expect(found({ inventory: loose })).toStrictEqual([
    "access-override:kikite/api/*",
    "access-policy:kikite/anyone",
    "access-policy:kikite/bypass",
  ]);
});

test("公開の R2・プロキシを通らない DNS・守られないトンネル・Pages・public になったリポを見つける", () => {
  const leaky: Inventory = {
    ...base,
    buckets: [{ name: "logs", devUrl: true, customDomains: ["files.masseater.dev"] }],
    records: [
      { name: "kikite.masseater.dev", type: "AAAA", content: "100::", proxied: false },
      { name: "home.masseater.dev", type: "CNAME", content: "abc.cfargotunnel.com", proxied: true },
    ],
    pages: [{ name: "kikite-pages", domains: ["kikite.masseater.dev"] }],
    repositories: [{ id: "1", name: "owner/secret", private: false }],
  };
  expect(found({ inventory: leaky, remembered: seen })).toStrictEqual([
    "dns-only:kikite.masseater.dev",
    "pages:kikite-pages",
    "public-bucket:logs",
    "repository-public:1",
    "tunnel:home.masseater.dev",
  ]);
});

test("OAuth を使うアプリの発見のメタデータが無いと見つける", () => {
  expect(found({ inventory: base, answers: { "oauth-discovery": UNAUTHORIZED } })).toStrictEqual([
    "oauth-discovery:kikite.masseater.dev",
  ]);
});

test("届かなかった探りは見逃さず、届かなかったと数える", () => {
  expect(found({ inventory: base, answers: { mcp: DOWN } })).toStrictEqual([
    "unreachable:https://mcp.masseater.dev/mcp",
  ]);
});
