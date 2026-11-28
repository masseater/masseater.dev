import {
  OVERWRITE,
  READ_ONLY,
  WRITE,
  one,
  clientOf,
  registeredTool,
  toolInputOf,
} from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { runTool } from "#/shared/api/index.ts";

import {
  CreateScheduleInput,
  GetScheduleInput,
  ListInput,
  ListSchedulesInput,
  ReplyInput,
  RoutineInput,
  SendInput,
  TakeInput,
  UpdateScheduleInput,
} from "./claude-request-input.ts";
import { RequestsDb, answer, listed, requestsDbOf, take } from "./claude-requests.ts";
import type { ClaudeRequest } from "./claude-requests.ts";
import { RoutineService, registerRoutine } from "./claude-routine.ts";
import type { RoutineBroker } from "./claude-routine.ts";
import { scheduleViews } from "./schedule-views.ts";
import { createSchedule, findSchedule, updateSchedule } from "./schedules.ts";
import { sendOrRun } from "./send-request.ts";

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
  "Send a request to the owner's Claude Code project, which does it and replies. Give text, or a schedule id to run that schedule now.";

const TAKE_DESCRIPTION =
  "Claim every untaken request for your claude.ai project, oldest first, then answer each with reply_to_request.";

const LIST_SCHEDULES_DESCRIPTION =
  "List the schedules that send requests to the owner's projects, with their next and last runs.";

const GET_SCHEDULE_DESCRIPTION = "Read one schedule.";

const CREATE_SCHEDULE_DESCRIPTION =
  "Create a schedule. At each cron time it queues its prompt as a request for its project.";

const UPDATE_SCHEDULE_DESCRIPTION =
  "Change the given fields of a schedule. Set enabled to false to stop it.";

const REPLY_DESCRIPTION = "Answer a request from take_claude_requests.";

const LIST_DESCRIPTION = "List requests sent with send_to_claude with their threads and replies.";

const SEND_SCHEMA = toolInputOf(SendInput);

const TAKE_SCHEMA = toolInputOf(TakeInput);

const REPLY_SCHEMA = toolInputOf(ReplyInput);

const ROUTINE_DESCRIPTION =
  "Register the claude.ai routine that wakes the project for send_to_claude.";

const ROUTINE_SCHEMA = toolInputOf(RoutineInput);

const LIST_SCHEMA = toolInputOf(ListInput);

const LIST_SCHEDULES_SCHEMA = toolInputOf(ListSchedulesInput);

const GET_SCHEDULE_SCHEMA = toolInputOf(GetScheduleInput);

const CREATE_SCHEDULE_SCHEMA = toolInputOf(CreateScheduleInput);

const UPDATE_SCHEDULE_SCHEMA = toolInputOf(UpdateScheduleInput);

const count = (requests: readonly ClaudeRequest[]): number => requests.length;

const registerSend = (provide: Provide): Register =>
  registeredTool(
    {
      name: "send_to_claude",
      description: SEND_DESCRIPTION,
      inputSchema: SEND_SCHEMA,
      annotations: WRITE,
    },
    (input, ctx) =>
      sendOrRun({ input, sender: clientOf(ctx) }).pipe(provide, runTool({ count: one })),
  );

const registerTake = (provide: Provide): Register =>
  registeredTool(
    {
      name: "take_claude_requests",
      description: TAKE_DESCRIPTION,
      inputSchema: TAKE_SCHEMA,
      annotations: WRITE,
    },
    (input) => take(Option.fromNullishOr(input.project)).pipe(provide, runTool({ count })),
  );

const registerReply = (provide: Provide): Register =>
  registeredTool(
    {
      name: "reply_to_request",
      description: REPLY_DESCRIPTION,
      inputSchema: REPLY_SCHEMA,
      annotations: WRITE,
    },
    (input) => answer(input).pipe(provide, runTool({ count: one })),
  );

const registerList = (provide: Provide): Register =>
  registeredTool(
    {
      name: "list_claude_replies",
      description: LIST_DESCRIPTION,
      inputSchema: LIST_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) =>
      listed({
        from: Option.fromNullishOr(input.after),
        schedule: Option.fromNullishOr(input.schedule),
      }).pipe(provide, runTool({ count })),
  );

const registerRoutineTool = (provide: Provide): Register =>
  registeredTool(
    {
      name: "register_claude_routine",
      description: ROUTINE_DESCRIPTION,
      inputSchema: ROUTINE_SCHEMA,
      annotations: WRITE,
    },
    (input) => registerRoutine(input).pipe(provide, runTool({ count: one })),
  );

const registerListSchedules = (provide: Provide): Register =>
  registeredTool(
    {
      name: "list_schedules",
      description: LIST_SCHEDULES_DESCRIPTION,
      inputSchema: LIST_SCHEDULES_SCHEMA,
      annotations: READ_ONLY,
    },
    () => scheduleViews.pipe(provide, runTool({ count: Arr.length })),
  );

const registerGetSchedule = (provide: Provide): Register =>
  registeredTool(
    {
      name: "get_schedule",
      description: GET_SCHEDULE_DESCRIPTION,
      inputSchema: GET_SCHEDULE_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => findSchedule(input.id).pipe(provide, runTool({ count: one })),
  );

const registerCreateSchedule = (provide: Provide): Register =>
  registeredTool(
    {
      name: "create_schedule",
      description: CREATE_SCHEDULE_DESCRIPTION,
      inputSchema: CREATE_SCHEDULE_SCHEMA,
      annotations: WRITE,
    },
    (input, ctx) =>
      createSchedule({ input, changedBy: clientOf(ctx) }).pipe(provide, runTool({ count: one })),
  );

const registerUpdateSchedule = (provide: Provide): Register =>
  registeredTool(
    {
      name: "update_schedule",
      description: UPDATE_SCHEDULE_DESCRIPTION,
      inputSchema: UPDATE_SCHEDULE_SCHEMA,
      annotations: OVERWRITE,
    },
    (input, ctx) =>
      updateSchedule({ input, changedBy: clientOf(ctx) }).pipe(provide, runTool({ count: one })),
  );

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
      registerListSchedules(provide),
      registerGetSchedule(provide),
      registerCreateSchedule(provide),
      registerUpdateSchedule(provide),
    );
  };
