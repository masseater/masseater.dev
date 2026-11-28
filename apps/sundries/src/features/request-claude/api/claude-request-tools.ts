import { READ_ONLY, WRITE, one, clientOf, toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, pipe } from "effect";

import { runTool } from "#/shared/api/index.ts";

import {
  ListInput,
  ReplyInput,
  RoutineInput,
  SendInput,
  TakeInput,
} from "./claude-request-input.ts";
import { RequestsDb, answer, listed, requestsDbOf, take } from "./claude-requests.ts";
import type { ClaudeRequest } from "./claude-requests.ts";
import { RoutineService, registerRoutine } from "./claude-routine.ts";
import type { RoutineBroker } from "./claude-routine.ts";
import { sendRequest } from "./send-request.ts";

export type RequestBindings = Readonly<{
  CLAUDE_REQUESTS: D1Database;
  CLAUDE_ROUTINE: RoutineBroker;
}>;

export type Register = (server: McpServer) => McpServer;

export type Services = RequestsDb | RoutineService;

type Provide = <Value, Failure>(
  effect: Effect.Effect<Value, Failure, Services>,
) => Effect.Effect<Value, Failure>;

const SEND_DESCRIPTION =
  "Send a request to the owner's Claude Code project, which does it and replies.";

const TAKE_DESCRIPTION =
  "Claim every untaken request for the owner's Claude Code project, oldest first, then answer each with reply_to_request.";

const REPLY_DESCRIPTION = "Answer a request from take_claude_requests.";

const LIST_DESCRIPTION = "List requests sent with send_to_claude with their threads and replies.";

const SEND_SCHEMA = toolInputOf(SendInput);

const TAKE_SCHEMA = toolInputOf(TakeInput);

const REPLY_SCHEMA = toolInputOf(ReplyInput);

const ROUTINE_DESCRIPTION =
  "Register the claude.ai routine that wakes the project for send_to_claude.";

const ROUTINE_SCHEMA = toolInputOf(RoutineInput);

const LIST_SCHEMA = toolInputOf(ListInput);

const count = (requests: readonly ClaudeRequest[]): number => requests.length;

const registerSend =
  (provide: Provide): Register =>
  (server) => {
    server.registerTool(
      "send_to_claude",
      {
        description: SEND_DESCRIPTION,
        inputSchema: SEND_SCHEMA,
        annotations: WRITE,
      },
      (input, ctx) =>
        sendRequest({ text: input.text, sender: clientOf(ctx) }).pipe(
          provide,
          runTool({ count: one }),
        ),
    );
    return server;
  };

const registerTake =
  (provide: Provide): Register =>
  (server) => {
    server.registerTool(
      "take_claude_requests",
      {
        description: TAKE_DESCRIPTION,
        inputSchema: TAKE_SCHEMA,
        annotations: WRITE,
      },
      () => take.pipe(provide, runTool({ count })),
    );
    return server;
  };

const registerReply =
  (provide: Provide): Register =>
  (server) => {
    server.registerTool(
      "reply_to_request",
      {
        description: REPLY_DESCRIPTION,
        inputSchema: REPLY_SCHEMA,
        annotations: WRITE,
      },
      (input) => answer(input).pipe(provide, runTool({ count: one })),
    );
    return server;
  };

const registerList =
  (provide: Provide): Register =>
  (server) => {
    server.registerTool(
      "list_claude_replies",
      {
        description: LIST_DESCRIPTION,
        inputSchema: LIST_SCHEMA,
        annotations: READ_ONLY,
      },
      (input) => listed(Option.fromNullishOr(input.after)).pipe(provide, runTool({ count })),
    );
    return server;
  };

const registerRoutineTool =
  (provide: Provide): Register =>
  (server) => {
    server.registerTool(
      "register_claude_routine",
      {
        description: ROUTINE_DESCRIPTION,
        inputSchema: ROUTINE_SCHEMA,
        annotations: WRITE,
      },
      (input) => registerRoutine(input).pipe(provide, runTool({ count: one })),
    );
    return server;
  };

export const provideRequests =
  (bindings: RequestBindings) =>
  <Value, Failure>(
    effect: Effect.Effect<Value, Failure, Services>,
  ): Effect.Effect<Value, Failure> =>
    effect.pipe(
      Effect.provideService(RequestsDb, requestsDbOf(bindings.CLAUDE_REQUESTS)),
      Effect.provideService(RoutineService, bindings.CLAUDE_ROUTINE),
    );

export const registerClaudeRequestTools =
  (bindings: RequestBindings): Register =>
  (server) => {
    const provide: Provide = provideRequests(bindings);
    return pipe(
      server,
      registerSend(provide),
      registerTake(provide),
      registerReply(provide),
      registerList(provide),
      registerRoutineTool(provide),
    );
  };
