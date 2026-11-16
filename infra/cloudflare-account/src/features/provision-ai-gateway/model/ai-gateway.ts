import { AI } from "@alchemy.run/cloudflare";
import { adopt } from "alchemy/AdoptPolicy";

const DEFAULT_GATEWAY_ID = "default";

const CACHE_DAYS = 30;

const SECONDS_PER_DAY = 86_400;

const KEPT_LOGS = 10_000_000;

const DAILY_SPEND_CENTS = 200;

const BLOCKED_SPEND_CENTS = 1;

const BLOCKED_MODELS = [
  "@cf/qwen/qwen3.8-27b",
  "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
];

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
    rules: [
      { limitType: "cost", limit: DAILY_SPEND_CENTS, window: "1 day" },
      {
        limitType: "cost",
        limit: BLOCKED_SPEND_CENTS,
        window: "1 day",
        model: { mode: "filter", values: BLOCKED_MODELS },
      },
    ],
  },
}).pipe(adopt(true));
