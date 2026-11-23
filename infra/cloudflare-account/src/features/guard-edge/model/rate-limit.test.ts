import { expect, test } from "vite-plus/test";

import { rateLimitRules } from "./rate-limit.ts";

const FREE_PLAN = { rules: 1, period: 10, mitigationTimeout: 10 } as const;

const TASK_CACHE_REQUESTS_PER_MINUTE = 1200;

test("stays within what the Free plan allows for rate limiting rules", () => {
  expect(rateLimitRules).toHaveLength(FREE_PLAN.rules);
  expect(rateLimitRules).toMatchObject([
    {
      action: "block",
      expression: 'starts_with(http.request.uri.path, "/")',
      ratelimit: {
        characteristics: ["cf.colo.id", "ip.src"],
        period: FREE_PLAN.period,
        mitigationTimeout: FREE_PLAN.mitigationTimeout,
      },
    },
  ]);
});

test("lets through every burst that the task cache's own limiter lets through", () => {
  expect(rateLimitRules).toMatchObject([
    { ratelimit: { requestsPerPeriod: TASK_CACHE_REQUESTS_PER_MINUTE } },
  ]);
});
