import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, one, WRITE } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Option, Schema } from "effect";

import { TOKEN_SCOPES } from "#/features/mcp/model/api-token.table";

import { mintToken } from "./api-token-api.server";
import { Label } from "./conversation-query";
import { meteredInput, runTool } from "./tool-call.server";

const TOOL = "api_token_issue";

const DEFAULT_SCOPE = "conversation:write";

const IssueInput = Schema.Struct({
  scope: Schema.optional(
    Schema.Literals(TOKEN_SCOPES).annotate({
      description:
        "conversation:write は会話履歴の送信（PUT /api/conversations）、memory:write は作業メモの一括書き込み（PUT /api/memories）。既定は conversation:write",
    }),
  ),
  label: Schema.optional(
    Label.annotate({ description: "トークンの用途を見分ける名前。例: cloud。既定は空" }),
  ),
});

type IssueRequest = typeof IssueInput.Type;

const ISSUE_SCHEMA = IssueInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const DESCRIPTION =
  "watashi の HTTP API に使うトークンを発行する。scope ごとに使える API が決まる。watashi の CLI やスクリプトに WATASHI_TOKEN として渡し、Authorization: Bearer で送る。値はこの応答でしか返らず、サーバーには SHA-256 だけが残る。失効は CLI の watashi token revoke <id> で行う";

const issuing = (caller: Caller, input: IssueRequest): Promise<CallToolResult> =>
  mintToken({
    scope: Option.getOrElse(Option.fromUndefinedOr(input.scope), () => DEFAULT_SCOPE),
    label: Option.getOrElse(Option.fromUndefinedOr(input.label), () => ""),
  }).pipe(runTool({ tool: TOOL, caller, project: NO_PROJECT, input, count: one }));

const registerTokenTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      TOOL,
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: TOOL, caller, project: NO_PROJECT })(ISSUE_SCHEMA),
        annotations: WRITE,
      },
      (input) => issuing(caller, input),
    );
    return server;
  };

export { registerTokenTools };
