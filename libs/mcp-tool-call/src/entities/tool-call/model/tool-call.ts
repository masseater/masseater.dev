import type { CallToolResult } from "@modelcontextprotocol/server";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Layer, Match, Option, Predicate, Schema } from "effect";

export const ERROR_TAG_META = "dev.masseater/error-tag";

export const RESULT_COUNT_META = "dev.masseater/result-count";

export type FailureText = Readonly<{ errorTag: string; text: string }>;

export type Counted<Value> = Readonly<{ count: (value: Value) => number }>;

type ToolOutcome =
  | Readonly<{ status: "ok"; resultCount: number; text: string }>
  | (FailureText & Readonly<{ status: "error" }>);

export type Describe<Failure> = Readonly<{ describe: (failure: Failure) => FailureText }>;

export type ToolRunner<Failure, Services> = <Value>(
  counted: Counted<Value>,
) => (effect: Effect.Effect<Value, Failure, Services>) => Promise<CallToolResult>;

export type ToolCalls<Failure> = Readonly<{
  runToolIn: <Services>(services: Layer.Layer<Services>) => ToolRunner<Failure, Services>;
  runTool: ToolRunner<Failure, never>;
}>;

const ONE = 1;

export const NO_PROJECT = "";

export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

export const OVERWRITE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

export const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

export const one = (): number => ONE;

export const encodeJson = (value: unknown): Effect.Effect<string> =>
  Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(value).pipe(Effect.orDie);

const textOf = (value: unknown): Effect.Effect<string> =>
  Option.match(Option.liftPredicate(value, Predicate.isString), {
    onNone: () => encodeJson(value),
    onSome: Effect.succeed,
  });

const toOutcome =
  <Failure>(describe: Describe<Failure>["describe"]) =>
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

const toResult = (outcome: ToolOutcome): CallToolResult =>
  Match.value(outcome).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ text, resultCount }) => ({
        content: [{ type: "text" as const, text }],
        isError: false,
        _meta: { [RESULT_COUNT_META]: resultCount },
      }),
      error: ({ text, errorTag }) => ({
        content: [{ type: "text" as const, text }],
        isError: true,
        _meta: { [ERROR_TAG_META]: errorTag },
      }),
    }),
  );

const runToolInOf =
  <Failure>({ describe }: Describe<Failure>) =>
  <Services>(services: Layer.Layer<Services>): ToolRunner<Failure, Services> =>
  <Value>({ count }: Counted<Value>) =>
  (effect: Effect.Effect<Value, Failure, Services>): Promise<CallToolResult> =>
    effect.pipe(toOutcome(describe)(count), Effect.map(toResult), runner(services));

export const toolCalls = <Failure>(describe: Describe<Failure>): ToolCalls<Failure> => {
  const runToolIn = runToolInOf<Failure>(describe);
  return { runToolIn, runTool: runToolIn(Layer.empty) };
};
