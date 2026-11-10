import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolCalls } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

type ToolName = "write_sloppedia_article" | "read_web_analytics" | "search_slides" | "get_deck";

const { meteredInput, runToolIn, runTool } = toolCalls<ToolName, UpstreamFailed>({
  dataset: () => env.TOOL_CALLS,
  describe: ({ service, message }) => ({
    errorTag: "UpstreamFailed",
    text: `${service} failed: ${message}`,
  }),
});

export { meteredInput, runTool, runToolIn };
export type { ToolName };
