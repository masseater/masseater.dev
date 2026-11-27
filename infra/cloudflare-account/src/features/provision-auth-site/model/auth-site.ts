import { Website, Workers } from "@alchemy.run/cloudflare";
import { makeRandom } from "alchemy";
import { Effect, Hash, Option } from "effect";

import { JAPAN_PLACEMENT } from "#/shared/config/index.ts";

const AUTH_REQUESTS_PER_MINUTE = 60;

export interface AuthSiteProps<Bindings> {
  readonly domain: string;
  readonly name: Option.Option<string>;
  readonly bindings: Bindings;
  readonly cpuMs: number;
}

export const authSite = Effect.fn("authSite")(function* authSite<Bindings extends object>({
  domain,
  name,
  bindings,
  cpuMs,
}: AuthSiteProps<Bindings>) {
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  const AUTH_LIMITER = Workers.RateLimit("AUTH_LIMITER", {
    namespaceId: Math.abs(Hash.string(domain)),
    simple: { limit: AUTH_REQUESTS_PER_MINUTE, period: 60 },
  });
  return yield* Website.Vite("Web", {
    ...Option.match(name, { onNone: () => ({}), onSome: (siteName) => ({ name: siteName }) }),
    compatibility: { flags: ["global_fetch_strictly_public"] },
    logpush: true,
    limits: { cpuMs },
    placement: JAPAN_PLACEMENT,
    domain,
    workersDev: false,
    env: { ...bindings, BETTER_AUTH_SECRET, AUTH_LIMITER },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
  });
});
