import type { ChatContentItems } from "@effect/ai-openrouter/Generated";
import { OpenRouterClient, layerConfig } from "@effect/ai-openrouter/OpenRouterClient";
import type { Answer } from "@effect/ai-openrouter/OpenRouterSchema";
import { Array as Arr, Config, Effect, Layer, Option, Redacted, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

import { ModelApi } from "./model-api.ts";
import type { Part } from "./model-api.ts";
import { ModelError } from "./model-error.ts";

const PRODUCT_NAME = "ocr-decide";

const REPOSITORY_URL = "https://github.com/masseater/masseater.dev";

const QUESTION_ID = "field";

const NO_COST = 0;

const NO_PROBABILITY = 0;

type Decisions = OpenRouterClient["Service"]["createDecisions"];

type Completion = OpenRouterClient["Service"]["createChatCompletion"];

type Question =
  | Readonly<{ type: "choice"; instructions: string; criteria: Readonly<Record<string, string>> }>
  | Readonly<{ type: "noul"; instructions: string }>;

type DecisionAnswer = typeof Answer.Type;

type AnswerTag = Readonly<Pick<DecisionAnswer, "type">>;

type ChoiceAnswer = Extract<DecisionAnswer, Readonly<{ type: "choice" }>>;

type NoulAnswer = Extract<DecisionAnswer, Readonly<{ type: "noul" }>>;

const isChoice = (answer: AnswerTag): answer is ChoiceAnswer => answer.type === "choice";

const isNoul = (answer: AnswerTag): answer is NoulAnswer => answer.type === "noul";

const site = {
  siteReferrer: Config.succeed(REPOSITORY_URL),
  siteTitle: Config.succeed(PRODUCT_NAME),
  transformClient: HttpClient.mapRequest(
    HttpClientRequest.setHeader("X-OpenRouter-App-Visibility", "hidden"),
  ),
};

const costOf = (cost: number | null | undefined): number =>
  Option.fromNullishOr(cost).pipe(Option.getOrElse(() => NO_COST));

const asModelError = (error: Readonly<{ message: string }>): ModelError =>
  ModelError.make({ reason: error.message });

const toContent = (part: Part): ChatContentItems => {
  if (part.type === "text") {
    return part;
  }
  return {
    type: "image_url",
    image_url: { url: `data:image/png;base64,${Base64.encode(part.png)}` },
  };
};

const decide = Effect.fn("ocr-decide.openrouter.decide")(function* decide(
  createDecisions: Decisions,
  request: Readonly<{ model: string; state: string; question: Question }>,
) {
  const [body] = yield* createDecisions({
    model: request.model,
    state: request.state,
    questions: { [QUESTION_ID]: request.question },
  }).pipe(Effect.mapError(asModelError));
  return {
    answer: Option.fromNullishOr(body.answers[QUESTION_ID]),
    costUsd: costOf(body.usage.cost),
  };
});

const choose =
  (createDecisions: Decisions) =>
  ({
    model,
    state,
    instructions,
    options,
  }: Readonly<{
    model: string;
    state: string;
    instructions: string;
    options: Readonly<Record<string, string>>;
  }>): Effect.Effect<
    Readonly<{ choice: string; probability: number; costUsd: number }>,
    ModelError
  > =>
    decide(createDecisions, {
      model,
      state,
      question: { type: "choice", instructions, criteria: { ...options } },
    }).pipe(
      Effect.flatMap(({ answer, costUsd }) =>
        answer.pipe(
          Option.filter(isChoice),
          Option.match({
            onNone: () => Effect.fail(ModelError.make({ reason: `${model} returned no choice` })),
            onSome: ({ choice, probabilities }) =>
              Effect.succeed({
                choice,
                probability: Option.fromNullishOr(probabilities).pipe(
                  Option.flatMap((all) => Option.fromNullishOr(all[choice])),
                  Option.getOrElse(() => NO_PROBABILITY),
                ),
                costUsd,
              }),
          }),
        ),
      ),
    );

const probability =
  (createDecisions: Decisions) =>
  ({
    model,
    state,
    instructions,
  }: Readonly<{ model: string; state: string; instructions: string }>): Effect.Effect<
    Readonly<{ probability: number; costUsd: number }>,
    ModelError
  > =>
    decide(createDecisions, { model, state, question: { type: "noul", instructions } }).pipe(
      Effect.flatMap(({ answer, costUsd }) =>
        answer.pipe(
          Option.filter(isNoul),
          Option.match({
            onNone: () =>
              Effect.fail(ModelError.make({ reason: `${model} returned no probability` })),
            onSome: ({ noul }) => Effect.succeed({ probability: noul, costUsd }),
          }),
        ),
      ),
    );

const generateJson =
  (createChatCompletion: Completion) =>
  ({
    model,
    parts,
    jsonSchema,
  }: Readonly<{ model: string; parts: readonly Part[]; jsonSchema: object }>): Effect.Effect<
    Readonly<{ content: string; costUsd: number }>,
    ModelError
  > =>
    createChatCompletion({
      model,
      messages: [{ role: "user", content: pipe(parts, Arr.map(toContent)) }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "answer", strict: true, schema: { ...jsonSchema } },
      },
    }).pipe(
      Effect.mapError(asModelError),
      Effect.flatMap(([body]) =>
        Arr.head(body.choices).pipe(
          Option.flatMap(({ message }) => Option.fromNullishOr(message.content)),
          Option.filter((content) => typeof content === "string"),
          Option.match({
            onNone: () => Effect.fail(ModelError.make({ reason: `${model} returned no text` })),
            onSome: (content) =>
              Effect.succeed({
                content,
                costUsd: Option.fromNullishOr(body.usage).pipe(
                  Option.map(({ cost }) => costOf(cost)),
                  Option.getOrElse(() => NO_COST),
                ),
              }),
          }),
        ),
      ),
      Effect.withSpan("ocr-decide.openrouter.generate", { attributes: { model } }),
    );

const modelApiLayer = Layer.effect(
  ModelApi,
  Effect.gen(function* makeModelApi() {
    const client = yield* OpenRouterClient;
    return ModelApi.of({
      choose: choose(client.createDecisions),
      probability: probability(client.createDecisions),
      generateJson: generateJson(client.createChatCompletion),
    });
  }),
);

const keyedClient = layerConfig({ apiKey: Config.Redacted("OPENROUTER_API_KEY"), ...site });

const openRouter = modelApiLayer.pipe(
  Layer.provide(keyedClient),
  Layer.provide(FetchHttpClient.layer),
);

const clientWithKey = (apiKey: string): ReturnType<typeof layerConfig> => {
  const fixedKey = Config.succeed(Redacted.make(apiKey));
  return layerConfig({ apiKey: fixedKey, ...site });
};

const openRouterWithKey = (apiKey: string): Layer.Layer<ModelApi, Config.ConfigError> =>
  modelApiLayer.pipe(Layer.provide(clientWithKey(apiKey)), Layer.provide(FetchHttpClient.layer));

export { PRODUCT_NAME, openRouter, openRouterWithKey };
