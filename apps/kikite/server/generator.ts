import { textStream } from "@masseater.dev/claude-agent";
import type { Stream } from "effect";
import { Context, Layer } from "effect";

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

const agentStream = ({ prompt, model }: Generation): Stream.Stream<string, GenerationFailed> =>
  textStream({
    prompt: prompt.user,
    system: prompt.system,
    model,
    failure: failed,
  });

const agentGenerator = Layer.succeed(Generator, Generator.of({ stream: agentStream }));

export { Generator, agentGenerator };
