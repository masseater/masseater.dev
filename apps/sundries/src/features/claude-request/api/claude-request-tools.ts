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
  "Send a request to the owner's Claude Code project, which starts a thread to do it and replies. Read replies with list_claude_replies by the returned id. If woke is not fired, the hourly check picks it up later.";

const TAKE_DESCRIPTION =
  "For threads of the owner's Claude Code project: claim every untaken request, oldest first. Do each one and answer with reply_to_request.";

const REPLY_DESCRIPTION =
  "Answer a request from take_claude_requests with the result, URLs of what you made, or questions.";

const LIST_DESCRIPTION =
  "Return requests sent with send_to_claude with when they were taken, their thread URL and reply, 50 at a time: newest first, or oldest first after the given id.";

const SEND_SCHEMA = SendInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const TAKE_SCHEMA = TakeInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const REPLY_SCHEMA = ReplyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const ROUTINE_DESCRIPTION =
  "Register the claude.ai routine that send_to_claude fires to wake the project. Use only after the owner recreated that routine.";

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
