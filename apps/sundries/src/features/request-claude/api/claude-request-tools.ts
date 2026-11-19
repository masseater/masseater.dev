import { READ_ONLY, WRITE, one, compactInput, clientOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema, pipe } from "effect";

import { runTool } from "#/shared/api/index.ts";

import {
  ListInput,
  ReplyInput,
  RoutineInput,
  SendInput,
  TakeInput,
} from "./claude-request-input.ts";
import { answer, enqueue, listed, take } from "./claude-requests.ts";
import type { ClaudeRequest } from "./claude-requests.ts";
import { registerRoutine, wakeProject } from "./claude-routine.ts";

export type Register = (server: McpServer) => McpServer;

const SEND_DESCRIPTION =
  "Send a request to the owner's Claude Code project, which does it and replies.";

const TAKE_DESCRIPTION =
  "Claim every untaken request for the owner's Claude Code project, oldest first, then answer each with reply_to_request.";

const REPLY_DESCRIPTION = "Answer a request from take_claude_requests.";

const LIST_DESCRIPTION = "List requests sent with send_to_claude with their threads and replies.";

const SEND_SCHEMA = SendInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const TAKE_SCHEMA = TakeInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const REPLY_SCHEMA = ReplyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const ROUTINE_DESCRIPTION =
  "Register the claude.ai routine that wakes the project for send_to_claude.";

const ROUTINE_SCHEMA = RoutineInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const LIST_SCHEMA = ListInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const count = (requests: readonly ClaudeRequest[]): number => requests.length;

const registerSend: Register = (server) => {
  server.registerTool(
    "send_to_claude",
    {
      description: SEND_DESCRIPTION,
      inputSchema: compactInput(SEND_SCHEMA),
      annotations: WRITE,
    },
    (input, ctx) =>
      enqueue({ text: input.text, sender: clientOf(ctx) }).pipe(
        Effect.flatMap(({ id }) => wakeProject.pipe(Effect.map((woke) => ({ id, woke })))),
        runTool({ count: one }),
      ),
  );
  return server;
};

const registerTake: Register = (server) => {
  server.registerTool(
    "take_claude_requests",
    {
      description: TAKE_DESCRIPTION,
      inputSchema: compactInput(TAKE_SCHEMA),
      annotations: WRITE,
    },
    () => take.pipe(runTool({ count })),
  );
  return server;
};

const registerReply: Register = (server) => {
  server.registerTool(
    "reply_to_request",
    {
      description: REPLY_DESCRIPTION,
      inputSchema: compactInput(REPLY_SCHEMA),
      annotations: WRITE,
    },
    (input) => answer(input).pipe(runTool({ count: one })),
  );
  return server;
};

const registerList: Register = (server) => {
  server.registerTool(
    "list_claude_replies",
    {
      description: LIST_DESCRIPTION,
      inputSchema: compactInput(LIST_SCHEMA),
      annotations: READ_ONLY,
    },
    (input) => listed(Option.fromNullishOr(input.after)).pipe(runTool({ count })),
  );
  return server;
};

const registerRoutineTool: Register = (server) => {
  server.registerTool(
    "register_claude_routine",
    {
      description: ROUTINE_DESCRIPTION,
      inputSchema: compactInput(ROUTINE_SCHEMA),
      annotations: WRITE,
    },
    (input) => registerRoutine(input).pipe(runTool({ count: one })),
  );
  return server;
};

export const registerClaudeRequestTools: Register = (server) =>
  pipe(server, registerSend, registerTake, registerReply, registerList, registerRoutineTool);
