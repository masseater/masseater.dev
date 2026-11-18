import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import type { GatewayOptions } from "@r_masseater/workers-tracing/workers-ai";
import { Array as Arr, Effect, Schema } from "effect";

export type ChatModel = Readonly<{
  run: (model: string, inputs: object, options: GatewayOptions) => Promise<unknown>;
}>;

const Message = Schema.Struct({ content: Schema.String });

const Choice = Schema.Struct({ message: Message });

const Completion = Schema.Struct({ choices: Schema.NonEmptyArray(Choice) });

const fail = failedAt("workers-ai");

export const chatAnswer = ({
  ai,
  model,
  agent,
  prompt,
  inputs,
}: Readonly<{
  ai: ChatModel;
  model: string;
  agent: string;
  prompt: string;
  inputs: object;
}>): Effect.Effect<string, UpstreamFailed> =>
  runWorkersAi({
    operation: "chat",
    model,
    caller: `watashi-mcp.${agent}`,
    prompt,
    call: (options) => ai.run(model, inputs, options),
  }).pipe(
    Effect.mapError(({ cause }) => fail(cause)),
    Effect.flatMap((raw) =>
      Schema.decodeUnknownEffect(Completion)(raw).pipe(Effect.mapError(fail)),
    ),
    Effect.map((completion) => Arr.headNonEmpty(completion.choices).message.content),
  );
