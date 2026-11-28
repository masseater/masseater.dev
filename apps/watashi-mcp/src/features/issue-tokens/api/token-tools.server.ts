import { one, WRITE, toolInputOf } from "@masseater.dev/mcp-tool-call";
import { Label, TOKEN_SCOPES } from "@masseater.dev/watashi-protocol";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Option, Schema } from "effect";

import type { ToolRun } from "#/shared/api/index.server.ts";
import type { Database } from "#/shared/db/index.server.ts";

import { mintToken } from "./api-token-api.server.ts";

const TOOL = "api_token_issue";

const DEFAULT_SCOPE = "conversation:write";

const IssueInput = Schema.Struct({
  scope: Schema.optional(
    Schema.Literals(TOKEN_SCOPES).annotate({
      description:
        "conversation:write (default): PUT /api/conversations. memory:write: PUT /api/memories. The token is shown once; send it as Authorization: Bearer and revoke it with watashi token revoke <id>",
    }),
  ),
  label: Schema.optional(Label.annotate({ description: "What the token is for, such as cloud" })),
});

type IssueRequest = typeof IssueInput.Type;

const ISSUE_SCHEMA = toolInputOf(IssueInput);

const DESCRIPTION = "Issue a token for the watashi HTTP API.";

const issuing =
  (runTool: ToolRun<Database>) =>
  (input: IssueRequest): Promise<CallToolResult> =>
    mintToken({
      scope: Option.getOrElse(Option.fromUndefinedOr(input.scope), () => DEFAULT_SCOPE),
      label: Option.getOrElse(Option.fromUndefinedOr(input.label), () => ""),
    }).pipe(runTool({ count: one }));

export const registerTokenTools =
  (runTool: ToolRun<Database>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      TOOL,
      {
        description: DESCRIPTION,
        inputSchema: ISSUE_SCHEMA,
        annotations: WRITE,
      },
      (input) => issuing(runTool)(input),
    );
    return server;
  };
