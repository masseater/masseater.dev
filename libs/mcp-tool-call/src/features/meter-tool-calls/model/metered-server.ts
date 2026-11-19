import type {
  Implementation,
  JSONRPCRequest,
  Result,
  ServerContext,
} from "@modelcontextprotocol/server";
import { McpServer, Server } from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Cause, Clock, Effect, Exit, Layer, Option, Predicate, Schema, pipe } from "effect";

import { ERROR_TAG_META, RESULT_COUNT_META, encodeJson } from "#/entities/tool-call/index.ts";

const TOOLS_CALL = "tools/call";

const UNKNOWN_CLIENT = "unknown";

const NO_ERROR = "";

const TOOL_ERROR = "ToolError";

const PROTOCOL_ERROR = "ProtocolError";

const NO_RESULTS = 0;

const NO_TEXT = "";

const CallParams = Schema.Struct({
  name: Schema.String,
  arguments: Schema.optional(Schema.Unknown),
});

const ProjectArgument = Schema.Struct({ project: Schema.String });

const ToolResult = Schema.Struct({
  isError: Schema.optional(Schema.Boolean),
  content: Schema.optional(Schema.Array(Schema.Unknown)),
  _meta: Schema.optional(
    Schema.Struct({
      [ERROR_TAG_META]: Schema.optional(Schema.String),
      [RESULT_COUNT_META]: Schema.optional(Schema.Number),
    }),
  ),
});

type Handler = (request: JSONRPCRequest, ctx: ServerContext) => Promise<Result>;

type Call = Readonly<{
  tool: string;
  input: unknown;
  project: string;
  client: string;
  userAgent: string;
}>;

type Outcome = Readonly<{
  status: "ok" | "error";
  errorTag: string;
  resultCount: number;
  output: unknown;
}>;

const byteLength = (text: string): number => new TextEncoder().encode(text).byteLength;

const callOf = (request: JSONRPCRequest, ctx: ServerContext): Call => {
  const params = Schema.decodeUnknownOption(CallParams)(request.params);
  const input = Option.flatMap(params, ({ arguments: args }) => Option.fromNullishOr(args));
  return {
    tool: Option.match(params, { onNone: () => NO_TEXT, onSome: ({ name }) => name }),
    input: Option.getOrUndefined(input),
    project: pipe(
      input,
      Option.flatMap(Schema.decodeUnknownOption(ProjectArgument)),
      Option.match({ onNone: () => NO_TEXT, onSome: ({ project }) => project }),
    ),
    client: pipe(
      Option.fromNullishOr(ctx.http?.authInfo?.clientId),
      Option.filter(Predicate.isString),
      Option.getOrElse(() => UNKNOWN_CLIENT),
    ),
    userAgent: ctx.http?.req?.headers.get("user-agent") ?? NO_TEXT,
  };
};

const resultOutcome = (result: Result): Outcome =>
  Option.match(Schema.decodeUnknownOption(ToolResult)(result), {
    onNone: () => ({ status: "ok", errorTag: NO_ERROR, resultCount: NO_RESULTS, output: result }),
    onSome: ({ isError, _meta }) =>
      isError === true
        ? {
            status: "error",
            errorTag: _meta?.[ERROR_TAG_META] ?? TOOL_ERROR,
            resultCount: NO_RESULTS,
            output: result,
          }
        : {
            status: "ok",
            errorTag: NO_ERROR,
            resultCount: _meta?.[RESULT_COUNT_META] ?? NO_RESULTS,
            output: result,
          },
  });

const thrownOutcome = (cause: unknown): Outcome => ({
  status: "error",
  errorTag: PROTOCOL_ERROR,
  resultCount: NO_RESULTS,
  output: String(cause),
});

const record = (
  dataset: AnalyticsEngineDataset,
  call: Call,
  outcome: Outcome,
  latencyMs: number,
): Effect.Effect<void> =>
  Effect.all([encodeJson(call.input ?? {}), encodeJson(outcome.output)]).pipe(
    Effect.flatMap(([input, output]) => {
      const inputBytes = byteLength(input);
      const outputBytes = byteLength(output);
      return Effect.sync(() => {
        dataset.writeDataPoint({
          indexes: [call.tool],
          blobs: [
            call.tool,
            outcome.status,
            outcome.errorTag,
            call.client,
            call.project,
            call.userAgent,
          ],
          doubles: [latencyMs, inputBytes, outputBytes, outcome.resultCount],
        });
      }).pipe(
        Effect.andThen(Effect.logInfo("mcp tool call")),
        Effect.annotateLogs({
          event: "mcp_tool_call",
          tool: call.tool,
          status: outcome.status,
          errorTag: outcome.errorTag,
          client: call.client,
          userAgent: call.userAgent,
          project: call.project,
          latencyMs,
          inputBytes,
          outputBytes,
          resultCount: outcome.resultCount,
        }),
      );
    }),
  );

const run = runner(Layer.empty);

const meteredCall =
  (dataset: AnalyticsEngineDataset, handler: Handler): Handler =>
  (request, ctx) => {
    const call = callOf(request, ctx);
    return run(
      Effect.gen(function* meteredToolCall() {
        const startedAt = yield* Clock.currentTimeMillis;
        const exit = yield* Effect.exit(
          Effect.tryPromise({ try: () => handler(request, ctx), catch: (cause) => cause }),
        );
        const finishedAt = yield* Clock.currentTimeMillis;
        const outcome = Exit.match(exit, {
          onFailure: thrownOutcome,
          onSuccess: resultOutcome,
        });
        yield* record(dataset, call, outcome, finishedAt - startedAt);
        return exit;
      }).pipe(
        Effect.withSpan(`mcp.tool.${call.tool}`, {
          attributes: { "mcp.client": call.client, "mcp.project": call.project },
        }),
      ),
    ).then((exit) =>
      Exit.match(exit, {
        onFailure: (cause) => Promise.reject(Cause.squash(cause)),
        onSuccess: (result) => Promise.resolve(result),
      }),
    );
  };

class MeteredServer extends Server {
  readonly #dataset: AnalyticsEngineDataset;

  constructor(info: Implementation, dataset: AnalyticsEngineDataset) {
    super(info);
    this.#dataset = dataset;
  }

  protected override _wrapHandler(method: string, handler: Handler): Handler {
    const wrapped = super._wrapHandler(method, handler);
    return method === TOOLS_CALL ? meteredCall(this.#dataset, wrapped) : wrapped;
  }
}

export class MeteredMcpServer extends McpServer {
  override readonly server: Server;

  constructor(info: Implementation, dataset: AnalyticsEngineDataset) {
    super(info);
    this.server = new MeteredServer(info, dataset);
  }
}
