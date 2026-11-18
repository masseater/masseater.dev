import { Array as Arr, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import { table } from "#/shared/lib/markdown.ts";

export type Event = Readonly<{ body?: unknown; attributes: Readonly<Record<string, unknown>> }>;

export type ToolWork = Readonly<{ tool: string; calls: number; failures: number; seconds: number }>;

export type Work = Readonly<{
  session: string;
  requests: number;
  apiErrors: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  apiSeconds: number;
  tools: readonly ToolWork[];
}>;

const PREFIX = "claude_code.";
const API_REQUEST = "api_request";
const API_ERROR = "api_error";
const TOOL_RESULT = "tool_result";
const MILLIS = 1000;
const NOTHING = 0;
const TOP_TOOLS = 5;
const COST_DIGITS = 2;
const WHOLE = 0;
const UNKNOWN_TOOL = "unknown";

const textOf = (value: unknown): Option.Option<string> =>
  Option.liftPredicate(value, (found): found is string => typeof found === "string");

const numberOf =
  (key: string) =>
  (event: Event): number =>
    pipe(
      Option.fromNullishOr(event.attributes[key]),
      Option.map(Number),
      Option.filter(Number.isFinite),
      Option.getOrElse(() => NOTHING),
    );

const named =
  (name: string) =>
  (event: Event): boolean =>
    event.body === `${PREFIX}${name}` || event.attributes["event.name"] === name;

const total =
  (key: string) =>
  (events: readonly Event[]): number =>
    pipe(events, Arr.map(numberOf(key)), Num.sumAll);

const failed = (event: Event): boolean => String(event.attributes["success"]) === "false";

const toolOf = (event: Event): string =>
  Option.getOrElse(textOf(event.attributes["tool_name"]), () => UNKNOWN_TOOL);

const bySeconds = Order.flip(Order.mapInput(Num.Order, (work: ToolWork) => work.seconds));
const byCost = Order.flip(Order.mapInput(Num.Order, (work: Work) => work.costUsd));

const toolWork = ([tool, calls]: readonly [string, readonly Event[]]): ToolWork => ({
  tool,
  calls: calls.length,
  failures: pipe(calls, Arr.filter(failed), Arr.length),
  seconds: total("duration_ms")(calls) / MILLIS,
});

const toolsOf = (results: readonly Event[]): readonly ToolWork[] =>
  Arr.sort(pipe(results, Arr.groupBy(toolOf), Rec.toEntries, Arr.map(toolWork)), bySeconds);

const countOf =
  (name: string) =>
  (events: readonly Event[]): number =>
    pipe(events, Arr.filter(named(name)), Arr.length);

export const workOf =
  (session: string) =>
  (events: readonly Event[]): Work => {
    const requests = pipe(events, Arr.filter(named(API_REQUEST)));
    const results = pipe(events, Arr.filter(named(TOOL_RESULT)));
    return {
      session,
      requests: requests.length,
      apiErrors: countOf(API_ERROR)(events),
      inputTokens: total("input_tokens")(requests),
      outputTokens: total("output_tokens")(requests),
      cacheReadTokens: total("cache_read_tokens")(requests),
      cacheCreationTokens: total("cache_creation_tokens")(requests),
      costUsd: total("cost_usd")(requests),
      apiSeconds: total("duration_ms")(requests) / MILLIS,
      tools: toolsOf(results),
    };
  };

const failuresOf = (work: ToolWork): string =>
  pipe(
    Option.liftPredicate(work.failures, (count) => count > NOTHING),
    Option.match({ onNone: () => "", onSome: (count) => ` (${String(count)} failed)` }),
  );

const toolCell = (work: ToolWork): string =>
  `${work.tool} ${String(work.calls)}x ${work.seconds.toFixed(WHOLE)}s${failuresOf(work)}`;

const toolsCell = (tools: readonly ToolWork[]): string =>
  pipe(tools, Arr.take(TOP_TOOLS), Arr.map(toolCell), Arr.join(", "));

const rowOf = (work: Work): Readonly<Record<string, string | number>> => ({
  session: work.session,
  requests: work.requests,
  apiErrors: work.apiErrors,
  outputTokens: work.outputTokens,
  cacheReadTokens: work.cacheReadTokens,
  costUsd: work.costUsd.toFixed(COST_DIGITS),
  apiSeconds: work.apiSeconds.toFixed(WHOLE),
  tools: toolsCell(work.tools),
});

const COLUMNS = [
  "session",
  "requests",
  "apiErrors",
  "outputTokens",
  "cacheReadTokens",
  "costUsd",
  "apiSeconds",
  "tools",
];

export const workSummary = (works: readonly Work[]): string =>
  pipe(Arr.sort(works, byCost), Arr.map(rowOf), table(COLUMNS));
