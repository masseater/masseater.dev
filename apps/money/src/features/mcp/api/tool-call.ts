import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolCalls } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { Match } from "effect";

import type { Rejected } from "./rejected";

type ToolName =
  | "upsert_account"
  | "import_csv"
  | "add_transactions"
  | "delete_import"
  | "record_balance"
  | "set_category"
  | "set_category_rule"
  | "delete_category_rule"
  | "get_settings"
  | "list_transactions"
  | "money_flow"
  | "monthly_totals"
  | "balance_sheet";

const { meteredInput, runToolIn } = toolCalls<ToolName, UpstreamFailed | Rejected>({
  dataset: () => env.TOOL_CALLS,
  describe: (failure) =>
    Match.value(failure).pipe(
      Match.tagsExhaustive({
        UpstreamFailed: ({ service, message }) => ({
          errorTag: "UpstreamFailed",
          text: `${service} failed: ${message}`,
        }),
        Rejected: ({ message }) => ({ errorTag: "Rejected", text: message }),
      }),
    ),
});

export { meteredInput, runToolIn };
export type { ToolName };
