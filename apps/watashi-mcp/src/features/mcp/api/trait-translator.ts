import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt } from "@masseater.dev/mcp-tool-call";
import type {
  TranslateRequestValue,
  TranslateResultValue,
} from "@masseater.dev/plamo-translate/request";
import { Context, Effect } from "effect";

type TranslatorBinding = Readonly<{
  translate: (request: TranslateRequestValue) => Promise<TranslateResultValue>;
}>;

class TraitTranslator extends Context.Service<
  TraitTranslator,
  { readonly toJapanese: (english: string) => Effect.Effect<string, UpstreamFailed> }
>()("watashi-mcp/features/mcp/api/trait-translator/TraitTranslator") {}

const fail = failedAt("plamo-translate");

const translatorOf = (binding: TranslatorBinding): TraitTranslator["Service"] =>
  TraitTranslator.of({
    toJapanese: (english) =>
      Effect.tryPromise({
        try: () => binding.translate({ text: english, from: "en", to: "ja", form: "plain" }),
        catch: fail,
      }).pipe(Effect.map(({ text }) => text)),
  });

export { TraitTranslator, translatorOf };
export type { TranslatorBinding };
