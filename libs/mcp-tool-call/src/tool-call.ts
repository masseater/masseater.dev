import type {
  CallToolResult,
  StandardSchemaV1,
  StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Array as Arr, Clock, Effect, Layer, Match, Option, Predicate, Schema, pipe } from "effect";

import type { Caller } from "./caller.ts";

export type ToolCall = Readonly<{
  tool: string;
  caller: Caller;
  project: string;
  input: unknown;
}>;

export type MeteredTool<Value> = ToolCall & Readonly<{ count: (value: Value) => number }>;

export type InputMeter = Omit<ToolCall, "input">;

export type FailureText = Readonly<{ errorTag: string; text: string }>;

type ToolOutcome =
  | Readonly<{ status: "ok"; resultCount: number; text: string }>
  | (FailureText & Readonly<{ status: "error" }>);

type ToolMetrics = Readonly<{ errorTag: string; resultCount: number }>;

export type Meter<Failure> = Readonly<{
  dataset: () => AnalyticsEngineDataset;
  describe: (failure: Failure) => FailureText;
}>;

export type ToolRunner<Failure, Services> = <Value>(
  call: MeteredTool<Value>,
) => (effect: Effect.Effect<Value, Failure, Services>) => Promise<CallToolResult>;

export type ToolCalls<Failure> = Readonly<{
  meteredInput: (
    meter: InputMeter,
  ) => <Input, Output>(
    schema: StandardSchemaWithJSON<Input, Output>,
  ) => StandardSchemaWithJSON<Input, Output>;
  runToolIn: <Services>(services: Layer.Layer<Services>) => ToolRunner<Failure, Services>;
  runTool: ToolRunner<Failure, never>;
}>;

const NO_ERROR = "";

const NO_LATENCY = 0;

const NO_RESULTS = 0;

const ONE = 1;

export const NO_PROJECT = "";

const INVALID_INPUT = "InvalidInput";

export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

export const OVERWRITE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

export const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

export const one = (): number => ONE;

export const encodeJson = (value: unknown): Effect.Effect<string> =>
  Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(value).pipe(Effect.orDie);

const byteLength = (text: string): number => new TextEncoder().encode(text).byteLength;

const metricsOf = (outcome: ToolOutcome): ToolMetrics =>
  Match.value(outcome).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ resultCount }) => ({ errorTag: NO_ERROR, resultCount }),
      error: ({ errorTag }) => ({ errorTag, resultCount: NO_RESULTS }),
    }),
  );

const toResult = (outcome: ToolOutcome): CallToolResult => ({
  content: [{ type: "text", text: outcome.text }],
  isError: outcome.status === "error",
});

const issueText = (issues: readonly StandardSchemaV1.Issue[]): string =>
  pipe(
    issues,
    Arr.map((issue) => issue.message),
    Arr.join("; "),
  );

const validation = <Input, Output>(
  schema: StandardSchemaWithJSON<Input, Output>,
  value: unknown,
): Effect.Effect<StandardSchemaV1.Result<Output>> =>
  Effect.promise(() => Promise.resolve(schema["~standard"].validate(value)));

const runInput = runner(Layer.empty);

const textOf = (value: unknown): Effect.Effect<string> =>
  Option.match(Option.liftPredicate(value, Predicate.isString), {
    onNone: () => encodeJson(value),
    onSome: Effect.succeed,
  });

const toOutcome =
  <Failure>(describe: Meter<Failure>["describe"]) =>
  <Value>(count: (value: Value) => number) =>
  <Services>(
    effect: Effect.Effect<Value, Failure, Services>,
  ): Effect.Effect<ToolOutcome, never, Services> =>
    Effect.matchEffect(effect, {
      onFailure: (failure) => Effect.succeed({ status: "error" as const, ...describe(failure) }),
      onSuccess: (value) =>
        textOf(value).pipe(
          Effect.map((text) => ({ status: "ok" as const, resultCount: count(value), text })),
        ),
    });

const record =
  (dataset: Meter<unknown>["dataset"]) =>
  (
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
          dataset().writeDataPoint({
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

const recordRejected =
  (dataset: Meter<unknown>["dataset"], meter: InputMeter, input: unknown) =>
  <Output>(
    result: StandardSchemaV1.Result<Output>,
  ): Effect.Effect<StandardSchemaV1.Result<Output>> =>
    Option.match(Option.fromNullishOr(result.issues), {
      onNone: () => Effect.succeed(result),
      onSome: (issues) =>
        record(dataset)(
          { ...meter, input },
          { status: "error", errorTag: INVALID_INPUT, text: issueText(issues) },
          NO_LATENCY,
        ).pipe(Effect.as(result)),
    });

const checked =
  (dataset: Meter<unknown>["dataset"], meter: InputMeter) =>
  <Input, Output>(
    schema: StandardSchemaWithJSON<Input, Output>,
    value: unknown,
  ): Effect.Effect<StandardSchemaV1.Result<Output>> =>
    validation(schema, value).pipe(
      Effect.flatMap(recordRejected(dataset, meter, value)),
      Effect.withSpan(`mcp.tool.${meter.tool}.input`),
    );

const meteredInputOf =
  (dataset: Meter<unknown>["dataset"]) =>
  (meter: InputMeter) =>
  <Input, Output>(
    schema: StandardSchemaWithJSON<Input, Output>,
  ): StandardSchemaWithJSON<Input, Output> => ({
    "~standard": {
      ...schema["~standard"],
      validate: (value) => runInput(checked(dataset, meter)(schema, value)),
    },
  });

const runToolInOf =
  <Failure>({ dataset, describe }: Meter<Failure>) =>
  <Services>(services: Layer.Layer<Services>): ToolRunner<Failure, Services> =>
  <Value>({ count, ...call }: MeteredTool<Value>) =>
  (effect: Effect.Effect<Value, Failure, Services>): Promise<CallToolResult> =>
    runner(services)(
      Effect.gen(function* meteredTool() {
        const startedAt = yield* Clock.currentTimeMillis;
        const outcome = yield* toOutcome(describe)(count)(effect);
        const finishedAt = yield* Clock.currentTimeMillis;
        yield* record(dataset)(call, outcome, finishedAt - startedAt);
        return toResult(outcome);
      }).pipe(
        Effect.withSpan(`mcp.tool.${call.tool}`, {
          attributes: { "mcp.client": call.caller.client, "mcp.project": call.project },
        }),
      ),
    );

export const toolCalls = <Failure>(meter: Meter<Failure>): ToolCalls<Failure> => {
  const runToolIn = runToolInOf<Failure>(meter);
  return {
    meteredInput: meteredInputOf(meter.dataset),
    runToolIn,
    runTool: runToolIn(Layer.empty),
  };
};
