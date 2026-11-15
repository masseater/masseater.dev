import { textStream, toolResult } from "@masseater.dev/claude-agent";
import type { Tooling } from "@masseater.dev/claude-agent";
import type { Effect, Stream } from "effect";
import { Context, Layer } from "effect";

import { failed } from "./generation-failed.ts";
import type { GenerationFailed } from "./generation-failed.ts";
import type { Prompt } from "./prompts.ts";

type Generation = Readonly<{ prompt: Prompt; model: string }>;

class Generator extends Context.Service<
  Generator,
  {
    readonly stream: (generation: Generation) => Stream.Stream<string, GenerationFailed>;
    readonly research: (
      generation: Generation,
      tooling: Tooling,
    ) => Effect.Effect<string, GenerationFailed>;
  }
>()("kikite/server/generator") {}

const agentStream = ({ prompt, model }: Generation): Stream.Stream<string, GenerationFailed> =>
  textStream({
    prompt: prompt.user,
    system: prompt.system,
    model,
    failure: failed,
  });

const agentResearch = (
  { prompt, model }: Generation,
  tooling: Tooling,
): Effect.Effect<string, GenerationFailed> =>
  toolResult(tooling)({ prompt: prompt.user, system: prompt.system, model, failure: failed });

const agentGenerator = Layer.succeed(
  Generator,
  Generator.of({ stream: agentStream, research: agentResearch }),
);

export { Generator, agentGenerator };
export type { Generation };
