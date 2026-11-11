import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { Context, Effect, Layer, Result, Stream } from "effect";

import { failed } from "./generation-failed.ts";
import type { GenerationFailed } from "./generation-failed.ts";
import type { Prompt } from "./prompts.ts";

type Generation = Readonly<{ prompt: Prompt; model: string }>;

class Generator extends Context.Service<
  Generator,
  {
    readonly stream: (generation: Generation) => Stream.Stream<string, GenerationFailed>;
  }
>()("kikite/server/generator") {}

const QUIET_OPTIONS = {
  tools: [],
  settingSources: [],
  persistSession: false,
  maxTurns: 1,
  thinking: { type: "disabled" },
  includePartialMessages: true,
} satisfies Options;

const failureOf = (message: SDKResultMessage): GenerationFailed => {
  if (message.subtype === "success") {
    return failed(message.result);
  }
  return failed(message.subtype);
};

const textOf = (
  message: SDKMessage,
): Effect.Effect<Result.Result<string, void>, GenerationFailed> => {
  if (message.type === "result" && message.is_error) {
    return Effect.fail(failureOf(message));
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

const agentStream = ({ prompt, model }: Generation): Stream.Stream<string, GenerationFailed> =>
  Stream.fromAsyncIterable(
    query({
      prompt: prompt.user,
      options: { ...QUIET_OPTIONS, model, systemPrompt: prompt.system },
    }),
    failed,
  ).pipe(Stream.filterMapEffect(textOf));

const agentGenerator = Layer.succeed(Generator, Generator.of({ stream: agentStream }));

export { Generator, agentGenerator };
