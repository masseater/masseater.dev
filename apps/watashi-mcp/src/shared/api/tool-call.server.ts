import { toolCalls } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { Match } from "effect";

import type { ToolFailure } from "./tool-failure";

export type ToolName =
  | "life_write"
  | "life_read"
  | "life_stats"
  | "memory_write"
  | "memory_read"
  | "watashi_search"
  | "watashi_profile"
  | "conversation_read"
  | "api_token_issue"
  | "money_upsert_account"
  | "money_import_csv"
  | "money_add_transactions"
  | "money_delete_import"
  | "money_record_balance"
  | "money_set_category"
  | "money_set_category_rule"
  | "money_delete_category_rule"
  | "money_settings"
  | "money_transactions"
  | "money_flow"
  | "money_monthly_totals"
  | "money_balance_sheet";

export const describeFailure = Match.type<ToolFailure>().pipe(
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

export const { meteredInput, runTool, runToolIn } = toolCalls<ToolName, ToolFailure>({
  dataset: () => env.TOOL_CALLS,
  describe: describeFailure,
});
