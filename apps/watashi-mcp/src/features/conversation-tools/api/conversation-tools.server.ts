import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, one, READ_ONLY } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { listSessions, readConversation } from "#/entities/conversation/index.server.ts";
import { ReadInput, listRequestOf, readRequestOf } from "#/entities/conversation/index.ts";
import type { Input } from "#/entities/conversation/index.ts";
import { meteredInput, runTool } from "#/shared/api/index.server.ts";

const READ_SCHEMA = ReadInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const DESCRIPTION =
  "Read the owner's conversations with AI (Claude Code transcripts, secrets redacted). Without sessionId, lists recent sessions; with it, returns the transcript from cursor, continued by nextCursor.";

const listing = (caller: Caller, input: Input): Promise<CallToolResult> =>
  listSessions(listRequestOf(input)).pipe(
    Effect.map((sessions) => ({ sessions })),
    runTool({
      tool: "conversation_read",
      caller,
      project: NO_PROJECT,
      input,
      count: ({ sessions }) => sessions.length,
    }),
  );

const reading = (caller: Caller, input: Input, sessionId: string): Promise<CallToolResult> =>
  readConversation(readRequestOf({ input, sessionId })).pipe(
    runTool({ tool: "conversation_read", caller, project: NO_PROJECT, input, count: one }),
  );

export const registerConversationTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "conversation_read",
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: "conversation_read", caller, project: NO_PROJECT })(
          READ_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        Option.match(Option.fromUndefinedOr(input.sessionId), {
          onNone: () => listing(caller, input),
          onSome: (sessionId) => reading(caller, input, sessionId),
        }),
    );
    return server;
  };
