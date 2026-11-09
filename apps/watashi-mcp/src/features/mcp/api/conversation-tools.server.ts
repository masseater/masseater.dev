import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import type { Caller } from "./caller";
import { ReadInput, listRequestOf, readRequestOf } from "./conversation-input";
import type { Input } from "./conversation-input";
import { listConversations, readConversation } from "./conversation-read.server";
import { NO_PROJECT, READ_ONLY, meteredInput, one, runTool } from "./tool-call.server";

const READ_SCHEMA = ReadInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const DESCRIPTION =
  '持ち主と AI の会話履歴（今は Claude Code のトランスクリプト）を読む。秘密は送る前に [REDACTED:<規則>] に伏せてある。sessionId を省くと最近の会話の一覧を、渡すとその会話の JSONL を cursor から順に返す。続きは nextCursor で読む。view: "owner" で持ち主の発言だけを返す';

const listing = (caller: Caller, input: Input): Promise<CallToolResult> =>
  listConversations(listRequestOf(input)).pipe(
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

const registerConversationTools =
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

export { registerConversationTools };
