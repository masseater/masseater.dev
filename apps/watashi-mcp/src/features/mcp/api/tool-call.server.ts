import { toolCalls } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { Match } from "effect";

import type { ToolFailure } from "#/features/mcp/model/tool-failure";

type ToolName =
  | "life_write"
  | "life_read"
  | "life_stats"
  | "memory_write"
  | "memory_read"
  | "watashi_search"
  | "watashi_profile"
  | "conversation_read"
  | "api_token_issue";

const describeFailure = Match.type<ToolFailure>().pipe(
  Match.tagsExhaustive({
    InvalidRecord: ({ message }) => ({ errorTag: "InvalidRecord", text: message }),
    MemoryNotFound: ({ project, memoryName }) => ({
      errorTag: "MemoryNotFound",
      text: `memory "${memoryName}" was not found in project "${project}". Pass description and content to create it.`,
    }),
    RecordNotFound: ({ ref }) => ({
      errorTag: "RecordNotFound",
      text: `${ref} was not found. Use life_read to find its ref.`,
    }),
    RevisionNotFound: ({ entity, entityId, rev }) => ({
      errorTag: "RevisionNotFound",
      text: `${entity}:${entityId} has no revision ${rev}. Read it with revisions: true to list its revisions.`,
    }),
    StorageFailed: ({ message }) => ({
      errorTag: "StorageFailed",
      text: `storage failed: ${message}`,
    }),
    UpstreamFailed: ({ service, message }) => ({
      errorTag: "UpstreamFailed",
      text: `${service} failed: ${message}`,
    }),
  }),
);

const { meteredInput, runTool } = toolCalls<ToolName, ToolFailure>({
  dataset: () => env.TOOL_CALLS,
  describe: describeFailure,
});

export { describeFailure, meteredInput, runTool };
export type { ToolName };
