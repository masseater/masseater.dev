import { NodeHttpServer } from "@effect/platform-node";
import {
  Array as Arr,
  Boolean as Bool,
  Context,
  Effect,
  Layer,
  Number as Num,
  Option,
  Record as Rec,
  Ref,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";
import type { HttpServerError } from "effect/http";

import type { TestError } from "./oxlint.test.support.ts";

type Reply = "yes" | "no";

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;
const NO_HITS = 0;
const FIRST_HIT = 1;
const LIKELY = 0.95;
const UNLIKELY = 0.05;

const Criteria = Schema.Record(Schema.String, Schema.NullOr(Schema.String));

const Question = Schema.Struct({
  type: Schema.String,
  instructions: Schema.String,
  criteria: Schema.optional(Criteria),
});

const RunBody = Schema.Struct({
  model: Schema.String,
  state: Schema.Unknown,
  questions: Schema.Record(Schema.String, Question),
});

/** @internal */
export type Body = typeof RunBody.Type;

/** @internal */
export interface LoggedRun {
  readonly url: string;
  readonly authorization: string;
  readonly gateway: string;
  readonly metadata: string;
  readonly body: Body;
}

interface MockShape {
  readonly log: Ref.Ref<readonly LoggedRun[]>;
  readonly hits: Ref.Ref<number>;
  readonly baseURL: string;
}

/** @internal */
export class MockCloudflare extends Context.Service<MockCloudflare, MockShape>()(
  "@r_masseater/oxlint-plugin-decision/app/mock-cloudflare.test.support/MockCloudflare",
) {}

const yesOf = (reply: Reply): number =>
  Bool.match(reply === "yes", { onTrue: () => LIKELY, onFalse: () => UNLIKELY });

const answerOf = (reply: Reply, question: Body["questions"][string]): object => {
  if (question.type !== "choice") {
    return { type: "noul", noul: yesOf(reply) };
  }
  const labels = Rec.keys(question.criteria ?? {});
  const choice = Option.getOrElse(Arr.last(labels), () => "");
  return {
    type: "choice",
    choice,
    confidence: LIKELY,
    probabilities: Rec.fromEntries(
      pipe(
        labels,
        Arr.map(
          (label) =>
            [
              label,
              Bool.match(label === choice, { onTrue: () => LIKELY, onFalse: () => UNLIKELY }),
            ] as const,
        ),
      ),
    ),
  };
};

const resultOf = (body: Body, reply: Reply): object => ({
  success: true,
  errors: [],
  result: {
    model: body.model,
    answers: pipe(
      body.questions,
      Rec.map((question) => answerOf(reply, question)),
    ),
    usage: { input_tokens: 1, output_tokens: 0 },
  },
});

const replyOf = (token: string): Reply =>
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
  return HttpServerResponse.jsonUnsafe(resultOf(body, replyOf(token)));
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
    const body = yield* Schema.decodeUnknownEffect(RunBody)(json);
    const header = (name: string): string =>
      Option.getOrElse(Option.fromUndefinedOr(request.headers[name]), () => "");
    const authorization = header("authorization");
    const gateway = header("cf-aig-gateway-id");
    const metadata = header("cf-aig-metadata");
    yield* Ref.update(state.log, (log) => [
      ...log,
      { url: request.url, authorization, gateway, metadata, body },
    ]);
    const hits = yield* Ref.updateAndGet(state.hits, (count) => Num.sum(count, FIRST_HIT));
    return replyFor(body, Str.replace("Bearer ", "")(authorization), hits);
  });

const MockLive = Layer.effect(
  MockCloudflare,
  Effect.gen(function* make() {
    const log = yield* Ref.make<readonly LoggedRun[]>([]);
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
      HttpRouter.add("POST", "/client/v4/accounts/:account/ai/run/*", handler(state)),
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
export const loggedRuns: Effect.Effect<readonly LoggedRun[], TestError, MockCloudflare> =
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
    })),
  );
