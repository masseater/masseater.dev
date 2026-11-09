import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Option, Schema } from "effect";

import { mintToken } from "./api-token-api.server";
import type { Caller } from "./caller";
import { Label } from "./conversation-query";
import { NO_PROJECT, WRITE, meteredInput, one, runTool } from "./tool-call.server";

const TOOL = "conversation_token_issue";

const SCOPE = "conversation:write";

const IssueInput = Schema.Struct({
  label: Schema.optional(
    Label.annotate({ description: "トークンの用途を見分ける名前。例: cloud。既定は空" }),
  ),
});

type IssueRequest = typeof IssueInput.Type;

const ISSUE_SCHEMA = IssueInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const DESCRIPTION =
  "会話履歴を送るための API トークン（scope は conversation:write）を発行する。watashi の CLI に WATASHI_TOKEN として渡す。値はこの応答でしか返らず、サーバーには SHA-256 だけが残る。失効は CLI の watashi token revoke <id> で行う";

const issuing = (caller: Caller, input: IssueRequest): Promise<CallToolResult> =>
  mintToken({
    scope: SCOPE,
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
