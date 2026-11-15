import { AI } from "@alchemy.run/cloudflare";
import { adopt } from "alchemy/AdoptPolicy";

const DEFAULT_GATEWAY_ID = "default";

const CACHE_DAYS = 30;

const SECONDS_PER_DAY = 86_400;

const KEPT_LOGS = 10_000_000;

const aiGateway = AI.Gateway("DefaultAiGateway", {
  id: DEFAULT_GATEWAY_ID,
  isDefault: true,
  authentication: true,
  collectLogs: true,
  cacheTtl: CACHE_DAYS * SECONDS_PER_DAY,
  logManagement: KEPT_LOGS,
  logManagementStrategy: "DELETE_OLDEST",
}).pipe(adopt(true));

export { aiGateway };
