import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt } from "@masseater.dev/mcp-tool-call";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import type { GatewayOptions } from "@r_masseater/workers-tracing/workers-ai";
import { Array as Arr, Context, Effect, Schema, String as Str } from "effect";

export const TRANSLATE_MODEL = "@cf/google/gemma-4-26b-a4b-it";

const MAX_TOKENS = 4096;

const AGENT = "trait-translator";

const INSTRUCTIONS = Arr.join(
  [
    "Translate the user's English text into natural Japanese.",
    "Keep every line and every leading '- ' bullet exactly as they are, one translated line per source line.",
    "Keep proper nouns, product names and code as written.",
    "Answer with the translation only.",
  ],
  " ",
);

export type TranslatorModel = Readonly<{
  run: (model: string, inputs: object, options: GatewayOptions) => Promise<unknown>;
}>;

const Message = Schema.Struct({ content: Schema.String });

const Choice = Schema.Struct({ message: Message });

const Completion = Schema.Struct({ choices: Schema.NonEmptyArray(Choice) });

export class TraitTranslator extends Context.Service<
  TraitTranslator,
  { readonly toJapanese: (english: string) => Effect.Effect<string, UpstreamFailed> }
>()("watashi-mcp/entities/trait/api/trait-translator/TraitTranslator") {}

const fail = failedAt("workers-ai");

const inputsOf = (english: string): object => ({
  messages: [
    { role: "system", content: INSTRUCTIONS },
    { role: "user", content: english },
  ],
  max_tokens: MAX_TOKENS,
  chat_template_kwargs: { enable_thinking: false },
});

export const translatorOf = (ai: TranslatorModel): TraitTranslator["Service"] =>
  TraitTranslator.of({
    toJapanese: (english) =>
      runWorkersAi({
        operation: "chat",
        model: TRANSLATE_MODEL,
        caller: `watashi-mcp.${AGENT}`,
        prompt: AGENT,
        call: (options) => ai.run(TRANSLATE_MODEL, inputsOf(english), options),
      }).pipe(
        Effect.mapError(({ cause }) => fail(cause)),
        Effect.flatMap((raw) =>
          Schema.decodeUnknownEffect(Completion)(raw).pipe(Effect.mapError(fail)),
        ),
        Effect.map((completion) => Str.trim(Arr.headNonEmpty(completion.choices).message.content)),
      ),
  });
