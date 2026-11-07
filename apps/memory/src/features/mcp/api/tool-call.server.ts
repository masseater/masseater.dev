import type { CallToolResult } from "@modelcontextprotocol/server";
import { run } from "@r_masseater/workers-tracing/effect";
import { env } from "cloudflare:workers";
import { Clock, Effect, Match, Schema } from "effect";

import type { MemoryExists } from "#/features/mcp/model/memory-exists";
import type { MemoryNotFound } from "#/features/mcp/model/memory-not-found";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import type { Caller } from "./caller";

type ToolName = "save" | "update" | "search";

type ToolFailure = MemoryExists | MemoryNotFound | StorageFailed;

type ToolCall = Readonly<{ tool: ToolName; caller: Caller; project: string; input: unknown }>;

type MeteredTool<Value> = ToolCall & Readonly<{ count: (value: Value) => number }>;

type ToolOutcome =
  | Readonly<{ status: "ok"; resultCount: number; text: string }>
  | Readonly<{ status: "error"; errorTag: string; text: string }>;

type ToolMetrics = Readonly<{ errorTag: string; resultCount: number }>;

const NO_ERROR = "";

const NO_RESULTS = 0;

const encodeJson = (value: unknown): Effect.Effect<string> =>
  Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(value).pipe(Effect.orDie);

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
  (effect: Effect.Effect<Value, ToolFailure>): Effect.Effect<ToolOutcome> =>
    Effect.matchEffect(effect, {
      onFailure: (failure) =>
        Effect.succeed(
          Match.valueTags(failure, {
            MemoryExists: ({ project, memoryName }) => ({
              status: "error" as const,
              errorTag: "MemoryExists",
              text: `memory "${memoryName}" already exists in project "${project}". Use update to change it.`,
            }),
            MemoryNotFound: ({ project, memoryName }) => ({
              status: "error" as const,
              errorTag: "MemoryNotFound",
              text: `memory "${memoryName}" was not found in project "${project}". Use save to create it.`,
            }),
            StorageFailed: ({ message }) => ({
              status: "error" as const,
              errorTag: "StorageFailed",
              text: `storage failed: ${message}`,
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

const runTool =
  <Value>({ count, ...call }: MeteredTool<Value>) =>
  (effect: Effect.Effect<Value, ToolFailure>): Promise<CallToolResult> =>
    run(
      Effect.gen(function* meteredTool() {
        const startedAt = yield* Clock.currentTimeMillis;
        const outcome = yield* toOutcome(count)(effect);
        const finishedAt = yield* Clock.currentTimeMillis;
        yield* record(call, outcome, finishedAt - startedAt);
        return toResult(outcome);
      }).pipe(
        Effect.withSpan(`mcp.tool.${call.tool}`, {
          attributes: { "mcp.client": call.caller.client, "memory.project": call.project },
        }),
      ),
    );

export { runTool };
export type { MeteredTool, ToolCall, ToolFailure, ToolName };
