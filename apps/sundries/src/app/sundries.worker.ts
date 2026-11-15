import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/app/mcp";
import { MCP_PATH } from "#/shared/config";

export { ClaudeRequests } from "./claude-requests-entrypoint.ts";

export default mcpWorker({ path: MCP_PATH, serve: serveMcp });
