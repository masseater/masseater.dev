import { one, READ_ONLY, toolInputOf, registeredTool } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Effect, Option } from "effect";

import { listSessions, readConversation } from "#/entities/conversation/index.server.ts";
import type { ConversationObjects } from "#/entities/conversation/index.server.ts";
import { ReadInput, listRequestOf, readRequestOf } from "#/entities/conversation/index.ts";
import type { Input } from "#/entities/conversation/index.ts";
import type { ToolRun } from "#/shared/api/index.server.ts";
import type { Database } from "#/shared/db/index.server.ts";

const READ_SCHEMA = toolInputOf(ReadInput);

const DESCRIPTION =
  "Read the owner's conversations with AI (Claude Code transcripts, secrets redacted).";

const listing =
  (runTool: ToolRun<Database | ConversationObjects>) =>
  (input: Input): Promise<CallToolResult> =>
    listSessions(listRequestOf(input)).pipe(
      Effect.map((sessions) => ({ sessions })),
      runTool({ count: ({ sessions }) => sessions.length }),
    );

const reading =
  (runTool: ToolRun<Database | ConversationObjects>) =>
  (input: Input, sessionId: string): Promise<CallToolResult> =>
    readConversation(readRequestOf({ input, sessionId })).pipe(runTool({ count: one }));

export const registerConversationTools = (
  runTool: ToolRun<Database | ConversationObjects>,
): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "conversation_read",
      description: DESCRIPTION,
      inputSchema: READ_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) =>
      Option.match(Option.fromUndefinedOr(input.sessionId), {
        onNone: () => listing(runTool)(input),
        onSome: (sessionId) => reading(runTool)(input, sessionId),
      }),
  );
