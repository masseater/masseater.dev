import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { QUIET_OPTIONS, executableOptions, textStream } from "@masseater.dev/claude-agent";
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

const writeWith =
  (executable: Option.Option<string>) =>
  ({ system, prompt }: Instruction): Stream.Stream<string, AgentFailed> =>
    textStream({
      prompt,
      system,
      model: WRITING_MODEL,
      executable,
      failure: agentFailed,
    });

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

const judgeWith =
  (executable: Option.Option<string>) =>
  ({ system, prompt, schema, tools }: Judgement): Effect.Effect<unknown, AgentFailed> =>
    Stream.fromAsyncIterable(
      query({
        prompt,
        options: {
          ...QUIET_OPTIONS,
          ...executableOptions(executable),
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

const agentLayer = (executable: Option.Option<string>): Layer.Layer<Agent> =>
  Layer.succeed(Agent, Agent.of({ write: writeWith(executable), judge: judgeWith(executable) }));

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
