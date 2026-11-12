import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { Context, Effect, Layer, Option, Result, Schema, Stream } from "effect";

import { AgentFailed, agentFailed } from "./agent-failed.ts";

const WRITING_MODEL = "claude-opus-5-5";
const JUDGING_MODEL = "claude-haiku-5-5";
const JUDGING_TURNS = 8;
const NO_RESULT = "no result";

interface Instruction {
  readonly system: string;
  readonly prompt: string;
}

interface Judgement extends Instruction {
  readonly schema: Readonly<Record<string, unknown>>;
  readonly tools: readonly string[];
}

class Agent extends Context.Service<
  Agent,
  {
    readonly write: (instruction: Instruction) => Stream.Stream<string, AgentFailed>;
    readonly judge: (judgement: Judgement) => Effect.Effect<unknown, AgentFailed>;
  }
>()("yohaku-server/shared/agent/agent") {}

const QUIET_OPTIONS = {
  settingSources: [],
  persistSession: false,
  thinking: { type: "disabled" },
} satisfies Options;

const textOf = (message: SDKMessage): Effect.Effect<Result.Result<string, void>, AgentFailed> => {
  if (message.type === "result" && message.is_error) {
    return Effect.fail(AgentFailed.make({ message: message.subtype }));
  }
  if (
    message.type === "stream_event" &&
    message.event.type === "content_block_delta" &&
    message.event.delta.type === "text_delta"
  ) {
    return Effect.succeed(Result.succeed(message.event.delta.text));
  }
  return Effect.succeed(Result.failVoid);
};

const write = ({ system, prompt }: Instruction): Stream.Stream<string, AgentFailed> =>
  Stream.fromAsyncIterable(
    query({
      prompt,
      options: {
        ...QUIET_OPTIONS,
        tools: [],
        maxTurns: 1,
        includePartialMessages: true,
        model: WRITING_MODEL,
        systemPrompt: system,
      },
    }),
    agentFailed,
  ).pipe(Stream.filterMapEffect(textOf));

const structuredOf = (
  message: SDKMessage,
): Result.Result<Effect.Effect<unknown, AgentFailed>, void> => {
  if (message.type !== "result") {
    return Result.failVoid;
  }
  if (message.subtype === "success") {
    return Result.succeed(Effect.succeed(message.structured_output));
  }
  return Result.succeed(Effect.fail(AgentFailed.make({ message: message.subtype })));
};

const judge = ({ system, prompt, schema, tools }: Judgement): Effect.Effect<unknown, AgentFailed> =>
  Stream.fromAsyncIterable(
    query({
      prompt,
      options: {
        ...QUIET_OPTIONS,
        tools: [...tools],
        allowedTools: [...tools],
        maxTurns: JUDGING_TURNS,
        model: JUDGING_MODEL,
        systemPrompt: system,
        outputFormat: { type: "json_schema", schema: { ...schema } },
      },
    }),
    agentFailed,
  ).pipe(
    Stream.filterMap(structuredOf),
    Stream.runHead,
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(AgentFailed.make({ message: NO_RESULT })),
        onSome: (outcome) => outcome,
      }),
    ),
  );

const agentLayer = Layer.succeed(Agent, Agent.of({ write, judge }));

const judgeAs =
  <Shape extends Schema.Top & { readonly DecodingServices: never }>(shape: Shape) =>
  (
    asked: Readonly<{ system: string; prompt: string; tools: readonly string[] }>,
  ): Effect.Effect<Shape["Type"], AgentFailed, Agent> =>
    Effect.gen(function* judged() {
      const agent = yield* Agent;
      const { schema, definitions } = Schema.toJsonSchemaDocument(shape);
      const answer = yield* agent.judge({ ...asked, schema: { ...schema, $defs: definitions } });
      return yield* Schema.decodeUnknownEffect(shape)(answer).pipe(Effect.mapError(agentFailed));
    });

export { Agent, agentLayer, judgeAs };
