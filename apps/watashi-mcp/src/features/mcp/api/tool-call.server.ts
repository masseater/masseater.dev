import type { CallToolResult } from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { env } from "cloudflare:workers";
import { Clock, Effect, Layer, Match } from "effect";

import type { ToolFailure } from "#/features/mcp/model/tool-failure";

import type { Caller } from "./caller";
import { encodeJson } from "./storage.server";

type ToolName =
  | "memory_save"
  | "memory_update"
  | "memory_search"
  | "todo_add"
  | "todo_update"
  | "todo_list"
  | "history"
  | "restore"
  | "write_sloppedia_article"
  | "read_web_analytics"
  | "search_slides"
  | "get_deck";

type ToolCall = Readonly<{ tool: ToolName; caller: Caller; project: string; input: unknown }>;

type MeteredTool<Value> = ToolCall & Readonly<{ count: (value: Value) => number }>;

type ToolOutcome =
  | Readonly<{ status: "ok"; resultCount: number; text: string }>
  | Readonly<{ status: "error"; errorTag: string; text: string }>;

type ToolMetrics = Readonly<{ errorTag: string; resultCount: number }>;

const NO_ERROR = "";

const NO_RESULTS = 0;

const ONE = 1;

const NO_PROJECT = "";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

const OVERWRITE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

const one = (): number => ONE;

const byteLength = (text: string): number => new TextEncoder().encode(text).byteLength;

const metricsOf = (outcome: ToolOutcome): ToolMetrics =>
  Match.value(outcome).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ resultCount }) => ({ errorTag: NO_ERROR, resultCount }),
      error: ({ errorTag }) => ({ errorTag, resultCount: NO_RESULTS }),
    }),
  );

const toOutcome =
  <Value>(count: (value: Value) => number) =>
  <Services>(
    effect: Effect.Effect<Value, ToolFailure, Services>,
  ): Effect.Effect<ToolOutcome, never, Services> =>
    Effect.matchEffect(effect, {
      onFailure: (failure) =>
        Effect.succeed(
          Match.valueTags(failure, {
            MemoryExists: ({ project, memoryName }) => ({
              status: "error" as const,
              errorTag: "MemoryExists",
              text: `memory "${memoryName}" already exists in project "${project}". Use memory_update to change it.`,
            }),
            MemoryNotFound: ({ project, memoryName }) => ({
              status: "error" as const,
              errorTag: "MemoryNotFound",
              text: `memory "${memoryName}" was not found in project "${project}". Use memory_save to create it.`,
            }),
            TodoNotFound: ({ todoId }) => ({
              status: "error" as const,
              errorTag: "TodoNotFound",
              text: `todo ${todoId} was not found. Use todo_list to find its id.`,
            }),
            RevisionNotFound: ({ entity, entityId, rev }) => ({
              status: "error" as const,
              errorTag: "RevisionNotFound",
              text: `${entity} ${entityId} has no revision ${rev}. Use history to list its revisions.`,
            }),
            StorageFailed: ({ message }) => ({
              status: "error" as const,
              errorTag: "StorageFailed",
              text: `storage failed: ${message}`,
            }),
            UpstreamFailed: ({ service, message }) => ({
              status: "error" as const,
              errorTag: "UpstreamFailed",
              text: `${service} failed: ${message}`,
            }),
          }),
        ),
      onSuccess: (value) =>
        encodeJson(value).pipe(
          Effect.map((text) => ({ status: "ok" as const, resultCount: count(value), text })),
        ),
    });

const toResult = (outcome: ToolOutcome): CallToolResult => ({
  content: [{ type: "text", text: outcome.text }],
  isError: outcome.status === "error",
});

const record = (
  { tool, caller, project, input }: ToolCall,
  outcome: ToolOutcome,
  latencyMs: number,
): Effect.Effect<void> =>
  encodeJson(input).pipe(
    Effect.flatMap((encodedInput) => {
      const { errorTag, resultCount } = metricsOf(outcome);
      const inputBytes = byteLength(encodedInput);
      const outputBytes = byteLength(outcome.text);
      return Effect.sync(() => {
        env.TOOL_CALLS.writeDataPoint({
          indexes: [tool],
          blobs: [tool, outcome.status, errorTag, caller.client, project, caller.userAgent],
          doubles: [latencyMs, inputBytes, outputBytes, resultCount],
        });
      }).pipe(
        Effect.andThen(Effect.logInfo("mcp tool call")),
        Effect.annotateLogs({
          event: "mcp_tool_call",
          tool,
          status: outcome.status,
          errorTag,
          client: caller.client,
          userAgent: caller.userAgent,
          project,
          latencyMs,
          inputBytes,
          outputBytes,
          resultCount,
        }),
      );
    }),
  );

const runToolIn =
  <Services>(services: Layer.Layer<Services>) =>
  <Value>({ count, ...call }: MeteredTool<Value>) =>
  (effect: Effect.Effect<Value, ToolFailure, Services>): Promise<CallToolResult> =>
    runner(services)(
      Effect.gen(function* meteredTool() {
        const startedAt = yield* Clock.currentTimeMillis;
        const outcome = yield* toOutcome(count)(effect);
        const finishedAt = yield* Clock.currentTimeMillis;
        yield* record(call, outcome, finishedAt - startedAt);
        return toResult(outcome);
      }).pipe(
        Effect.withSpan(`mcp.tool.${call.tool}`, {
          attributes: { "mcp.client": call.caller.client, "mcp.project": call.project },
        }),
      ),
    );

const runTool = runToolIn(Layer.empty);

export { NO_PROJECT, OVERWRITE, READ_ONLY, WRITE, one, runTool, runToolIn };
export type { MeteredTool, ToolCall, ToolName };
