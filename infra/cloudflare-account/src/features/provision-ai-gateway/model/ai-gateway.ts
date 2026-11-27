import { AI } from "@alchemy.run/cloudflare";
import { adopt } from "alchemy/AdoptPolicy";

const DEFAULT_GATEWAY_ID = "default";

const CACHE_DAYS = 30;

const SECONDS_PER_DAY = 86_400;

const KEPT_LOGS = 10_000_000;

const FREE_NEURONS_PER_DAY = 10_000;

const CENTS_PER_THOUSAND_NEURONS = 1.1;

const NEURONS_PER_PRICE_UNIT = 1000;

const CENTS_PER_DOLLAR = 100;

const DAILY_SPEND_DOLLARS =
  Math.round((FREE_NEURONS_PER_DAY / NEURONS_PER_PRICE_UNIT) * CENTS_PER_THOUSAND_NEURONS) /
  CENTS_PER_DOLLAR;

export const aiGateway = AI.Gateway("DefaultAiGateway", {
  id: DEFAULT_GATEWAY_ID,
  isDefault: true,
  authentication: true,
  collectLogs: true,
  cacheTtl: CACHE_DAYS * SECONDS_PER_DAY,
  logManagement: KEPT_LOGS,
  logManagementStrategy: "DELETE_OLDEST",
  spendLimits: {
    enabled: true,
    rules: [{ limitType: "cost", limit: DAILY_SPEND_DOLLARS, window: "1 day" }],
  },
}).pipe(adopt(true));
