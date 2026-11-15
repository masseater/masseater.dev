import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/app/mcp/index.ts";
import { MCP_PATH } from "#/shared/config/index.ts";

export { ClaudeRequests } from "./claude-requests-entrypoint.ts";
export { Slides } from "./slides-entrypoint.ts";

export default mcpWorker({ path: MCP_PATH, serve: serveMcp });
