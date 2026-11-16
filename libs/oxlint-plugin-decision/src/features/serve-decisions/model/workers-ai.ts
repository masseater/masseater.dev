import { Answer } from "@effect/ai-openrouter/OpenRouterSchema";
import {
  Array as Arr,
  Config,
  Effect,
  Option,
  Schedule,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { captured, envNameOf, toJson } from "#/entities/decision/index.ts";
import type { DecideInput, DecisionResponse, WireRequest } from "#/entities/decision/index.ts";

import { appContext } from "./openrouter-app.ts";

const TOOL = "oxlint-plugin-decision";
const GATEWAY = "default";
const DEFAULT_API_URL = "https://api.cloudflare.com/client/v4";
const RUN_PATH = "/ai/run";
const TRAILING_SLASHES = /\/+$/u;
const MODEL_NAME = /(?<name>[^/]+)$/u;
const FIRST_REDIRECT = 300;
const RETRY_INITIAL_MS = 10;
const RETRY_EXPONENT = 2;

const Decisions = Schema.Struct({
  model: Schema.String,
  answers: Schema.Record(Schema.String, Answer),
});

const RunBody = Schema.Struct({ body: Schema.Struct({ result: Decisions }) });

const ErrorBody = Schema.Struct({
  errors: Schema.NonEmptyArray(Schema.Struct({ message: Schema.String })),
});

const decodeErrorBody = Schema.decodeUnknownOption(ErrorBody);

const accountUrl = ({ api, account }: Readonly<{ api: string; account: string }>): string =>
  `${Str.replace(TRAILING_SLASHES, "")(Str.trim(api))}/accounts/${Str.trim(account)}`;

/** @internal */
export const endpointOf = (env: DecideInput["env"]): Config.Config<string> =>
  Config.all({
    api: Config.String(envNameOf(env, "CLOUDFLARE_API_BASE_URL")).pipe(
      Config.withDefault(DEFAULT_API_URL),
    ),
    account: Config.NonEmptyString(envNameOf(env, "CLOUDFLARE_ACCOUNT_ID")),
  }).pipe(Config.map(accountUrl));

const modelNameOf = (model: string): string =>
  Option.getOrElse(captured(Str.match(MODEL_NAME)(model), "name"), () => model);

const messageOfBody = (body: unknown): string =>
  Option.match(decodeErrorBody(body), {
    onNone: () => "request failed",
    onSome: ({ errors }) =>
      pipe(
        errors,
        Arr.map(({ message }) => message),
        Arr.join("; "),
      ),
  });

const failureOf = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<never, string> =>
  response.json.pipe(
    Effect.option,
    Effect.flatMap((body) =>
      Effect.fail(`http ${String(response.status)}: ${messageOfBody(Option.getOrUndefined(body))}`),
    ),
  );

const workersAiRequest = (
  endpoint: string,
  wire: WireRequest,
): HttpClientRequest.HttpClientRequest =>
  HttpClientRequest.post(`${endpoint}${RUN_PATH}/${wire.model}`).pipe(
    HttpClientRequest.bodyJsonUnsafe({
      model: modelNameOf(wire.model),
      state: wire.state,
      questions: wire.questions,
    }),
  );

const post = Effect.fn("post")(function* post(
  endpoint: string,
  wire: WireRequest,
  { env }: Pick<DecideInput, "env">,
) {
  const token = yield* Config.Redacted(envNameOf(env, "CLOUDFLARE_API_TOKEN"));
  const app = yield* appContext;
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({
      retryOn: "response-only",
      schedule: Schedule.exponential(RETRY_INITIAL_MS, RETRY_EXPONENT),
    }),
  );
  return yield* workersAiRequest(endpoint, wire).pipe(
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.setHeaders({
      "cf-aig-gateway-id": GATEWAY,
      "cf-aig-metadata": toJson({ tool: TOOL, ...app }),
    }),
    client.execute,
  );
});

/** @internal */
export const sendWorkersAi = Effect.fn("sendWorkersAi")(function* sendWorkersAi(
  endpoint: string,
  wire: WireRequest,
  input: Pick<DecideInput, "env">,
) {
  const response = yield* post(endpoint, wire, input).pipe(
    Effect.mapError((error) => `network: ${error.message}`),
  );
  if (response.status >= FIRST_REDIRECT) {
    return yield* failureOf(response);
  }
  const run = yield* HttpClientResponse.schemaJson(RunBody)(response).pipe(
    Effect.mapError((error) => `invalid response: ${error.message}`),
  );
  return { model: wire.model, answers: run.body.result.answers } satisfies DecisionResponse;
});
