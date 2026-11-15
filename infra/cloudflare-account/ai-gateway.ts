import { AI } from "@alchemy.run/cloudflare";

const DEFAULT_GATEWAY_ID = "default";

const CACHE_DAYS = 30;

const SECONDS_PER_DAY = 86_400;

const KEPT_LOGS = 100_000;

export const aiGateway = AI.Gateway("DefaultAiGateway", {
  id: DEFAULT_GATEWAY_ID,
  authentication: true,
  collectLogs: true,
  cacheTtl: CACHE_DAYS * SECONDS_PER_DAY,
  logManagement: KEPT_LOGS,
  logManagementStrategy: "DELETE_OLDEST",
});
