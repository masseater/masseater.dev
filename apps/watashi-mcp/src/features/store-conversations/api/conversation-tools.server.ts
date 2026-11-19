import { one, READ_ONLY, compactInput } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { listSessions, readConversation } from "#/entities/conversation/index.server.ts";
import { ReadInput, listRequestOf, readRequestOf } from "#/entities/conversation/index.ts";
import type { Input } from "#/entities/conversation/index.ts";
import { runTool } from "#/shared/api/index.server.ts";

const READ_SCHEMA = ReadInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const DESCRIPTION =
  "Read the owner's conversations with AI (Claude Code transcripts, secrets redacted).";

const listing = (input: Input): Promise<CallToolResult> =>
  listSessions(listRequestOf(input)).pipe(
    Effect.map((sessions) => ({ sessions })),
    runTool({ count: ({ sessions }) => sessions.length }),
  );

const reading = (input: Input, sessionId: string): Promise<CallToolResult> =>
  readConversation(readRequestOf({ input, sessionId })).pipe(runTool({ count: one }));

export const registerConversationTools = (server: McpServer): McpServer => {
  server.registerTool(
    "conversation_read",
    {
      description: DESCRIPTION,
      inputSchema: compactInput(READ_SCHEMA),
      annotations: READ_ONLY,
    },
    (input) =>
      Option.match(Option.fromUndefinedOr(input.sessionId), {
        onNone: () => listing(input),
        onSome: (sessionId) => reading(input, sessionId),
      }),
  );
  return server;
};
