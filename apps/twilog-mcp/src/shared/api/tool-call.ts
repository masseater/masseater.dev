import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolCalls } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

export type ToolName = "search_posts";

export const { meteredInput, runTool } = toolCalls<ToolName, UpstreamFailed>({
  dataset: () => env.TOOL_CALLS,
  describe: ({ service, message }) => ({
    errorTag: "UpstreamFailed",
    text: `${service} failed: ${message}`,
  }),
});
