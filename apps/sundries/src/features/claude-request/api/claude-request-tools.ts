import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, READ_ONLY, WRITE, one } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema, pipe } from "effect";

import { meteredInput, runTool } from "#/shared/api/index.ts";

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

export type Register = (caller: Caller) => (server: McpServer) => McpServer;

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

const registerSend: Register = (caller) => (server) => {
  const meter = { tool: "send_to_claude", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "send_to_claude",
    {
      description: SEND_DESCRIPTION,
      inputSchema: meteredInput(meter)(SEND_SCHEMA),
      annotations: WRITE,
    },
    (input) =>
      enqueue({ text: input.text, sender: caller.client }).pipe(
        Effect.flatMap(({ id }) => wakeProject.pipe(Effect.map((woke) => ({ id, woke })))),
        runTool({ ...meter, input, count: one }),
      ),
  );
  return server;
};

const registerTake: Register = (caller) => (server) => {
  const meter = { tool: "take_claude_requests", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "take_claude_requests",
    {
      description: TAKE_DESCRIPTION,
      inputSchema: meteredInput(meter)(TAKE_SCHEMA),
      annotations: WRITE,
    },
    (input) => take.pipe(runTool({ ...meter, input, count })),
  );
  return server;
};

const registerReply: Register = (caller) => (server) => {
  const meter = { tool: "reply_to_request", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "reply_to_request",
    {
      description: REPLY_DESCRIPTION,
      inputSchema: meteredInput(meter)(REPLY_SCHEMA),
      annotations: WRITE,
    },
    (input) => answer(input).pipe(runTool({ ...meter, input, count: one })),
  );
  return server;
};

const registerList: Register = (caller) => (server) => {
  const meter = { tool: "list_claude_replies", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "list_claude_replies",
    {
      description: LIST_DESCRIPTION,
      inputSchema: meteredInput(meter)(LIST_SCHEMA),
      annotations: READ_ONLY,
    },
    (input) => listed(Option.fromNullishOr(input.after)).pipe(runTool({ ...meter, input, count })),
  );
  return server;
};

const registerRoutineTool: Register = (caller) => (server) => {
  const meter = { tool: "register_claude_routine", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "register_claude_routine",
    {
      description: ROUTINE_DESCRIPTION,
      inputSchema: meteredInput(meter)(ROUTINE_SCHEMA),
      annotations: WRITE,
    },
    (input) => registerRoutine(input).pipe(runTool({ ...meter, input, count: one })),
  );
  return server;
};

export const registerClaudeRequestTools: Register = (caller) => (server) =>
  pipe(
    server,
    registerSend(caller),
    registerTake(caller),
    registerReply(caller),
    registerList(caller),
    registerRoutineTool(caller),
  );
