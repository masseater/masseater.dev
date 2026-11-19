import type { McpServerFactory } from "@modelcontextprotocol/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { run } from "@r_masseater/workers-tracing/effect";
import {
  Array as Arr,
  Clock,
  Effect,
  Match,
  Option,
  Predicate,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type { CallerClaims } from "./caller.ts";
import { authInfoOf } from "./caller.ts";
import { ERROR_TAG_META, RESULT_COUNT_META, encodeJson } from "./tool-call.ts";

export type MeteredFetch = (request: Request, claims: CallerClaims) => Promise<Response>;

const TOOLS_CALL = "tools/call";

const POST = "POST";

const DATA_PREFIX = "data:";

const LINE_BREAK = "\n";

const NO_TEXT = "";

const NO_RESULTS = 0;

const TOOL_ERROR = "ToolError";

const PROTOCOL_ERROR = "ProtocolError";

const NO_RESPONSE = "NoResponse";

const RequestId = Schema.Union([Schema.String, Schema.Finite]);

const ToolCallMessage = Schema.Struct({
  id: RequestId,
  method: Schema.Literal(TOOLS_CALL),
  params: Schema.Struct({
    name: Schema.String,
    arguments: Schema.optional(Schema.Unknown),
  }),
});

const ProjectArgument = Schema.Struct({ project: Schema.String });

const ResultMeta = Schema.Struct({
  [ERROR_TAG_META]: Schema.optional(Schema.String),
  [RESULT_COUNT_META]: Schema.optional(Schema.Finite),
});

const ToolResult = Schema.Struct({
  isError: Schema.optional(Schema.Boolean),
  meta: Schema.optional(ResultMeta),
}).pipe(Schema.encodeKeys({ meta: "_meta" }));

const ResultMessage = Schema.Struct({ id: RequestId, result: ToolResult });

const ErrorMessage = Schema.Struct({ id: RequestId, error: Schema.Unknown });

const ResponseMessage = Schema.Union([ResultMessage, ErrorMessage]);

const Json = Schema.fromJsonString(Schema.Unknown);

const decodeToolCall = Schema.decodeUnknownOption(ToolCallMessage);

const decodeReply = Schema.decodeUnknownOption(ResponseMessage);

type ToolCall = typeof ToolCallMessage.Type;

type Reply = typeof ResponseMessage.Type;

type Caller = Readonly<{ client: string; userAgent: string }>;

type Outcome = Readonly<{
  status: "ok" | "error";
  errorTag: string;
  resultCount: number;
  output: unknown;
}>;

const parseJson = (text: string): Option.Option<unknown> => Schema.decodeOption(Json)(text);

const messagesOf = (text: string): readonly unknown[] =>
  pipe(parseJson(text), Option.match({ onNone: () => [], onSome: Arr.ensure }));

const toolCallsOf = (body: string): readonly ToolCall[] =>
  Arr.getSomes(Arr.map(messagesOf(body), (message) => decodeToolCall(message)));

const payloadsOf = (text: string): readonly string[] =>
  pipe(
    Str.split(LINE_BREAK)(text),
    Arr.map((line) =>
      pipe(
        Option.liftPredicate(line, Str.startsWith(DATA_PREFIX)),
        Option.map((data) => Str.trim(Str.slice(DATA_PREFIX.length)(data))),
      ),
    ),
    Arr.getSomes,
    Arr.match({ onEmpty: () => [text], onNonEmpty: (payloads) => payloads }),
  );

const repliesOf = (text: string): readonly Reply[] =>
  pipe(
    payloadsOf(text),
    Arr.flatMap(messagesOf),
    Arr.map((message) => decodeReply(message)),
    Arr.getSomes,
  );

const projectOf = (input: unknown): string =>
  pipe(
    Schema.decodeUnknownOption(ProjectArgument)(input),
    Option.match({ onNone: () => NO_TEXT, onSome: ({ project }) => project }),
  );

const failed = (errorTag: string, output: unknown): Outcome => ({
  status: "error",
  errorTag,
  resultCount: NO_RESULTS,
  output,
});

const resultOutcome = (result: typeof ToolResult.Type): Outcome => {
  const meta = Option.fromNullishOr(result.meta);
  return Match.value(result.isError === true).pipe(
    Match.when(true, () =>
      failed(
        pipe(
          meta,
          Option.flatMap((tags) => Option.fromNullishOr(tags[ERROR_TAG_META])),
          Option.getOrElse(() => TOOL_ERROR),
        ),
        result,
      ),
    ),
    Match.orElse(() => ({
      status: "ok" as const,
      errorTag: NO_TEXT,
      resultCount: pipe(
        meta,
        Option.flatMap((counts) => Option.fromNullishOr(counts[RESULT_COUNT_META])),
        Option.getOrElse(() => NO_RESULTS),
      ),
      output: result,
    })),
  );
};

const replyOutcome = (reply: Reply): Outcome =>
  Match.value(reply).pipe(
    Match.when(Predicate.hasProperty("result"), ({ result }) => resultOutcome(result)),
    Match.orElse((errored) => failed(PROTOCOL_ERROR, errored)),
  );

const outcomeOf =
  (replies: readonly Reply[]) =>
  ({ id }: ToolCall): Outcome =>
    pipe(
      Arr.findFirst(replies, (reply) => reply.id === id),
      Option.match({ onNone: () => failed(NO_RESPONSE, NO_TEXT), onSome: replyOutcome }),
    );

const byteLength = (text: string): number => new TextEncoder().encode(text).byteLength;

const record =
  (dataset: AnalyticsEngineDataset, caller: Caller, latencyMs: number) =>
  (call: ToolCall, outcome: Outcome): Effect.Effect<void> => {
    const tool = call.params.name;
    const input = Option.getOrElse(Option.fromNullishOr(call.params.arguments), () => ({}));
    const project = projectOf(input);
    return Effect.all([encodeJson(input), encodeJson(outcome.output)], { concurrency: 1 }).pipe(
      Effect.flatMap(([inputJson, outputJson]) => {
        const inputBytes = byteLength(inputJson);
        const outputBytes = byteLength(outputJson);
        return Effect.sync(() => {
          dataset.writeDataPoint({
            indexes: [tool],
            blobs: [
              tool,
              outcome.status,
              outcome.errorTag,
              caller.client,
              project,
              caller.userAgent,
            ],
            doubles: [latencyMs, inputBytes, outputBytes, outcome.resultCount],
          });
        }).pipe(
          Effect.andThen(Effect.logInfo("mcp tool call")),
          Effect.annotateLogs({
            event: "mcp_tool_call",
            tool,
            status: outcome.status,
            errorTag: outcome.errorTag,
            client: caller.client,
            userAgent: caller.userAgent,
            project,
            latencyMs,
            inputBytes,
            outputBytes,
            resultCount: outcome.resultCount,
          }),
        );
      }),
    );
  };

type Exchange = Readonly<{
  forward: () => Promise<Response>;
  dataset: AnalyticsEngineDataset;
  request: Request;
  client: string;
}>;

const callerOf = ({ request, client }: Exchange): Caller => ({
  client,
  userAgent: pipe(
    Option.fromNullishOr(request.headers.get("user-agent")),
    Option.getOrElse(() => NO_TEXT),
  ),
});

const readText = (message: Readonly<{ text: () => Promise<string> }>): Effect.Effect<string> =>
  Effect.promise(() => message.text());

const forwarded = ({ forward }: Exchange): Effect.Effect<Response> => Effect.promise(forward);

const toolNames = (calls: readonly ToolCall[]): readonly string[] =>
  pipe(
    calls,
    Arr.map(({ params }) => params.name),
  );

const meter =
  (exchange: Exchange) =>
  (calls: Arr.NonEmptyReadonlyArray<ToolCall>): Effect.Effect<Response> =>
    Effect.gen(function* meteredToolCalls() {
      const startedAt = yield* Clock.currentTimeMillis;
      const response = yield* forwarded(exchange);
      const text = yield* readText(response);
      const finishedAt = yield* Clock.currentTimeMillis;
      const outcome = outcomeOf(repliesOf(text));
      const write = record(exchange.dataset, callerOf(exchange), finishedAt - startedAt);
      yield* Effect.forEach(calls, (call) => write(call, outcome(call)), {
        concurrency: 1,
        discard: true,
      });
      return new Response(text, response);
    }).pipe(Effect.withSpan("mcp.tools.call", { attributes: { "mcp.tools": toolNames(calls) } }));

const meterCalls = (
  exchange: Exchange,
): ((calls: readonly ToolCall[]) => Effect.Effect<Response>) =>
  Arr.match({
    onEmpty: () => forwarded(exchange),
    onNonEmpty: meter(exchange),
  });

const meterBody = (exchange: Exchange): Promise<Response> => {
  const metered = meterCalls(exchange);
  return run(
    readText(exchange.request.clone()).pipe(Effect.map(toolCallsOf), Effect.flatMap(metered)),
  );
};

export const meteredMcpHandler =
  (dataset: AnalyticsEngineDataset) =>
  (factory: McpServerFactory): MeteredFetch => {
    const handler = createMcpHandler(factory);
    return (request, claims) => {
      const authInfo = authInfoOf(claims);
      const forward = (): Promise<Response> => handler.fetch(request, { authInfo });
      const exchange = { forward, dataset, request, client: authInfo.clientId };
      return Match.value(request.method).pipe(
        Match.when(POST, () => meterBody(exchange)),
        Match.orElse(forward),
      );
    };
  };
