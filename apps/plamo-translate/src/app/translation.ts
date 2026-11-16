import { TranslateRequest } from "@masseater.dev/plamo-translate-protocol";
import type { TranslateResultValue, TranslatorRpc } from "@masseater.dev/plamo-translate-protocol";
import { WorkerEntrypoint, env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { down, TEMPERATURE } from "#/entities/completion/index.ts";
import type { ModelDown, Asked } from "#/entities/completion/index.ts";
import { translateWith } from "#/features/translate-text/index.ts";
import { MODEL_NAME } from "#/shared/config/index.ts";
import { runLogged } from "#/shared/lib/run.ts";

import type { PlamoModel } from "./translator.worker.ts";

const OK = 200;
const BAD_REQUEST = 400;
const BAD_GATEWAY = 502;

const model = (): DurableObjectStub<PlamoModel> => env.MODEL.getByName(MODEL_NAME);

const textCompletion = ({ prompt, maxTokens }: Asked): Effect.Effect<string, ModelDown> =>
  Effect.gen(function* completeText() {
    const completion = yield* Effect.tryPromise({
      try: () => model().complete({ prompt, maxTokens }),
      catch: down,
    });
    yield* Effect.annotateCurrentSpan({
      "gen_ai.response.finish_reasons": [completion.stop_type],
      "gen_ai.usage.input_tokens": completion.tokens_evaluated,
      "gen_ai.usage.output_tokens": completion.tokens_predicted,
    });
    return completion.content;
  }).pipe(
    Effect.withSpan(`text_completion ${MODEL_NAME}`, {
      kind: "client",
      attributes: {
        "gen_ai.operation.name": "text_completion",
        "gen_ai.provider.name": "llama.cpp",
        "gen_ai.request.model": MODEL_NAME,
        "gen_ai.request.max_tokens": maxTokens,
        "gen_ai.request.temperature": TEMPERATURE,
      },
    }),
  );

const translate = Effect.fn("plamo.translate")(function* translate(input: unknown) {
  const request = yield* Schema.decodeUnknownEffect(TranslateRequest)(input);
  const text = yield* translateWith(textCompletion)(request);
  const result: TranslateResultValue = { text };
  return result;
});

export class Translator extends WorkerEntrypoint implements TranslatorRpc {
  public translate(input: unknown): Promise<TranslateResultValue> {
    return runLogged(translate(input).pipe(Effect.annotateLogs({ entrypoint: this.ctx.props })));
  }
}

const json = (body: unknown, status: number): Response => Response.json(body, { status });

const modelDown = (message: string): Effect.Effect<Response> =>
  Effect.logError("plamo.modelDown").pipe(
    Effect.annotateLogs({ message }),
    Effect.as(json({ message }, BAD_GATEWAY)),
  );

export const answer = (read: () => Promise<unknown>): Effect.Effect<Response> =>
  Effect.tryPromise({ try: read, catch: down }).pipe(
    Effect.flatMap(translate),
    Effect.map((result) => json(result, OK)),
    Effect.catchTags({
      SchemaError: ({ message }) => Effect.succeed(json({ message }, BAD_REQUEST)),
      ModelDown: ({ message }) => modelDown(message),
    }),
  );
