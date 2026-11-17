import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Context, Effect, String as Str } from "effect";

import { chatAnswer } from "#/shared/api/index.server.ts";
import type { ChatModel } from "#/shared/api/index.server.ts";

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

export class TraitTranslator extends Context.Service<
  TraitTranslator,
  { readonly toJapanese: (english: string) => Effect.Effect<string, UpstreamFailed> }
>()("watashi-mcp/entities/trait/api/trait-translator/TraitTranslator") {}

const inputsOf = (english: string): object => ({
  messages: [
    { role: "system", content: INSTRUCTIONS },
    { role: "user", content: english },
  ],
  max_tokens: MAX_TOKENS,
  chat_template_kwargs: { enable_thinking: false },
});

export const translatorOf = (ai: ChatModel): TraitTranslator["Service"] =>
  TraitTranslator.of({
    toJapanese: (english) =>
      chatAnswer({
        ai,
        model: TRANSLATE_MODEL,
        agent: AGENT,
        prompt: AGENT,
        inputs: inputsOf(english),
      }).pipe(Effect.map(Str.trim)),
  });
