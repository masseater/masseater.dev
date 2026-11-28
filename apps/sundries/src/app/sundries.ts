import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/app/mcp/index.ts";
import { MCP_PATH } from "#/shared/config/index.ts";
import type { AppEnv } from "#/shared/config/index.ts";

import { dispatch } from "./claude-requests.ts";

export { ClaudeRequests } from "./claude-requests.ts";
export { Schedules } from "./schedules.ts";
export { Slides } from "./slides.ts";

export default {
  ...mcpWorker({ path: MCP_PATH, serve: serveMcp }),
  scheduled: (_controller: ScheduledController, env: AppEnv): Promise<void> => dispatch(env),
} satisfies ExportedHandler<AppEnv>;
