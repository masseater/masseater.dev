import { NodeHttpServer } from "@effect/platform-node";
import {
  Array as Arr,
  Boolean as Bool,
  Context,
  Effect,
  Layer,
  Number as Num,
  Option,
  Ref,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";
import type { HttpServerError } from "effect/http";

import type { YesNo } from "#/features/serve-decisions/index.test.support.ts";

import type { TestError } from "./oxlint.test.support.ts";

type Answer = YesNo;

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;
const NO_HITS = 0;
const FIRST_HIT = 1;
const CERTAIN = 0;
const LIKELY_PROBABILITY = 0.95;
const UNLIKELY_PROBABILITY = 0.05;
const LIKELY = Math.log(LIKELY_PROBABILITY);
const UNLIKELY = Math.log(UNLIKELY_PROBABILITY);
const LABEL = /^q\d+:/gmu;

const ChatBody = Schema.Struct({
  model: Schema.String,
  logprobs: Schema.Boolean,
  top_logprobs: Schema.Finite,
  messages: Schema.NonEmptyArray(Schema.Struct({ role: Schema.String, content: Schema.String })),
  chat_template_kwargs: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)),
});

/** @internal */
export type Body = typeof ChatBody.Type;

/** @internal */
export interface LoggedChat {
  readonly url: string;
  readonly authorization: string;
  readonly gateway: string;
  readonly body: Body;
}

interface MockShape {
  readonly log: Ref.Ref<readonly LoggedChat[]>;
  readonly hits: Ref.Ref<number>;
  readonly baseURL: string;
}

/** @internal */
export class MockCloudflare extends Context.Service<MockCloudflare, MockShape>()(
  "@r_masseater/oxlint-plugin-decision/app/mock-cloudflare.test.support/MockCloudflare",
) {}

const logprobOf = (answer: Answer, word: Answer): number =>
  Bool.match(answer === word, { onTrue: () => LIKELY, onFalse: () => UNLIKELY });

const answerToken = (answer: Answer): object => ({
  token: ` ${answer}`,
  logprob: logprobOf(answer, answer),
  top_logprobs: [
    { token: " yes", logprob: logprobOf(answer, "yes") },
    { token: " no", logprob: logprobOf(answer, "no") },
  ],
});

const plain = (token: string): object => ({
  token,
  logprob: CERTAIN,
  top_logprobs: [{ token, logprob: CERTAIN }],
});

const lineOf = (answer: Answer, index: number): readonly object[] => [
  plain(`q${String(Num.sum(index, FIRST_HIT))}`),
  plain(":"),
  answerToken(answer),
  plain("\n"),
];

const completion = (body: Body, answer: Answer): object => {
  const { content: user } = Arr.lastNonEmpty(body.messages);
  const count = Option.match(Str.match(LABEL)(user), {
    onNone: () => NO_HITS,
    onSome: (found) => found.length,
  });
  return {
    model: body.model,
    choices: [
      {
        logprobs: {
          content: pipe(
            Arr.makeBy(count, (index) => lineOf(answer, index)),
            Arr.flatten,
          ),
        },
      },
    ],
  };
};

const answerFor = (token: string): Answer =>
  Bool.match(Str.startsWith("no")(token), { onTrue: () => "no", onFalse: () => "yes" });

const replyFor = (
  body: Body,
  token: string,
  hits: number,
): HttpServerResponse.HttpServerResponse => {
  if (token === "denied") {
    return HttpServerResponse.jsonUnsafe(
      { success: false, errors: [{ message: "Authentication error" }] },
      { status: UNAUTHORIZED },
    );
  }
  if (token === "busy" && hits === FIRST_HIT) {
    return HttpServerResponse.jsonUnsafe(
      {},
      { status: TOO_MANY_REQUESTS, headers: { "retry-after-ms": "10" } },
    );
  }
  return HttpServerResponse.jsonUnsafe(completion(body, answerFor(token)));
};

const handler = (
  state: MockShape,
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpServerError.HttpServerError | Schema.SchemaError,
  HttpServerRequest.HttpServerRequest
> =>
  Effect.gen(function* handle() {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const json = yield* request.json;
    const body = yield* Schema.decodeUnknownEffect(ChatBody)(json);
    const header = (name: string): string =>
      Option.getOrElse(Option.fromUndefinedOr(request.headers[name]), () => "");
    const authorization = header("authorization");
    yield* Ref.update(state.log, (log) => [
      ...log,
      { url: request.url, authorization, gateway: header("cf-aig-gateway-id"), body },
    ]);
    const hits = yield* Ref.updateAndGet(state.hits, (count) => Num.sum(count, FIRST_HIT));
    return replyFor(body, Str.replace("Bearer ", "")(authorization), hits);
  });

const MockLive = Layer.effect(
  MockCloudflare,
  Effect.gen(function* make() {
    const log = yield* Ref.make<readonly LoggedChat[]>([]);
    const hits = yield* Ref.make(NO_HITS);
    const baseURL = yield* HttpServer.addressFormattedWith((address) =>
      Effect.succeed(`${address}/client/v4`),
    );
    return { log, hits, baseURL };
  }),
);

const routes = Layer.unwrap(
  Effect.gen(function* serve() {
    const state = yield* MockCloudflare;
    return HttpRouter.serve(
      HttpRouter.add("POST", "/client/v4/accounts/:account/ai/v1/chat/completions", handler(state)),
      { disableLogger: true, disableListenLog: true },
    );
  }),
);

/** @internal */
export const MockCloudflareLayer = routes.pipe(
  Layer.provideMerge(MockLive),
  Layer.provideMerge(NodeHttpServer.layerTest),
);

/** @internal */
export const loggedChats: Effect.Effect<readonly LoggedChat[], TestError, MockCloudflare> =
  Effect.gen(function* logged() {
    const { log } = yield* MockCloudflare;
    return yield* Ref.get(log);
  });

/** @internal */
export const cloudflareEnv = (
  token: string,
): Effect.Effect<Readonly<Record<string, string>>, never, MockCloudflare> =>
  MockCloudflare.pipe(
    Effect.map(({ baseURL }) => ({
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: "account-id",
      CLOUDFLARE_API_BASE_URL: baseURL,
      CLOUDFLARE_AI_GATEWAY_ID: "lint-gateway",
    })),
  );
