import type { Ruleset } from "@alchemy.run/cloudflare";

const FREE_PLAN_SECONDS = 10;

const REQUESTS_PER_PERIOD = 1200;

/** @internal */
export const rateLimitRules: Ruleset.Rule[] = [
  {
    description: "Block an address that floods the zone",
    expression: 'starts_with(http.request.uri.path, "/")',
    action: "block",
    ratelimit: {
      characteristics: ["cf.colo.id", "ip.src"],
      period: FREE_PLAN_SECONDS,
      requestsPerPeriod: REQUESTS_PER_PERIOD,
      mitigationTimeout: FREE_PLAN_SECONDS,
    },
  },
];
