import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, one, WRITE } from "@masseater.dev/mcp-tool-call";
import { Label, TOKEN_SCOPES } from "@masseater.dev/watashi-protocol";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Option, Schema } from "effect";

import { meteredInput, runTool } from "#/shared/api/index.server.ts";

import { mintToken } from "./api-token-api.server.ts";

const TOOL = "api_token_issue";

const DEFAULT_SCOPE = "conversation:write";

const IssueInput = Schema.Struct({
  scope: Schema.optional(
    Schema.Literals(TOKEN_SCOPES).annotate({
      description:
        "conversation:write (default): PUT /api/conversations. memory:write: PUT /api/memories",
    }),
  ),
  label: Schema.optional(Label.annotate({ description: "What the token is for, such as cloud" })),
});

type IssueRequest = typeof IssueInput.Type;

const ISSUE_SCHEMA = IssueInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const DESCRIPTION =
  "Issue a token for the watashi HTTP API, used as WATASHI_TOKEN and sent as Authorization: Bearer. The value appears only in this response. Revoke it with `watashi token revoke <id>`.";

const issuing = (caller: Caller, input: IssueRequest): Promise<CallToolResult> =>
  mintToken({
    scope: Option.getOrElse(Option.fromUndefinedOr(input.scope), () => DEFAULT_SCOPE),
    label: Option.getOrElse(Option.fromUndefinedOr(input.label), () => ""),
  }).pipe(runTool({ tool: TOOL, caller, project: NO_PROJECT, input, count: one }));

export const registerTokenTools =
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
