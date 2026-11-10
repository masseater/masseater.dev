import { NodeHttpServer } from "@effect/platform-node";
import { Context, Effect, Layer, Option, Record as Rec, Ref, Schema, String as Str } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";
import type { HttpServerError } from "effect/http";

import { FIRST_HIT, NO_HITS, answer, isRefinement } from "./mock-answers.ts";
import { RawBodySchema, normalized, rejectionOf } from "./mock-body.ts";
import type { Body, RawBody } from "./mock-body.ts";
import type { TestError } from "./oxlint.ts";

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;

interface LoggedRequest {
  readonly authorization: string;
  readonly app: Readonly<Record<"referer" | "title" | "visibility", string>>;
  readonly body: Body;
  readonly sentState: RawBody["state"];
}

interface MockState {
  readonly log: Ref.Ref<readonly LoggedRequest[]>;
  readonly hits: Ref.Ref<Readonly<Record<string, number>>>;
}

interface MockShape extends MockState {
  readonly baseURL: string;
}

class MockOpenRouter extends Context.Service<MockOpenRouter, MockShape>()(
  "@r_masseater/oxlint-plugin-decision/tests/mock-openrouter/MockOpenRouter",
) {}

const unauthorized = HttpServerResponse.jsonUnsafe(
  { error: { message: "bad key" } },
  { status: UNAUTHORIZED },
);

const replyFor = (
  body: Body,
  token: string,
  hits: number,
): Effect.Effect<HttpServerResponse.HttpServerResponse> => {
  const refinement = isRefinement(body);
  if (token === "slow" || (refinement && token === "refinement-slow")) {
    return Effect.never;
  }
  if (token === "unauthorized" || (refinement && token === "refinement-fails")) {
    return Effect.succeed(unauthorized);
  }
  if (token === "flaky" && hits === FIRST_HIT) {
    return Effect.succeed(
      HttpServerResponse.jsonUnsafe(
        {},
        { status: TOO_MANY_REQUESTS, headers: { "retry-after-ms": "10" } },
      ),
    );
  }
  return Effect.succeed(HttpServerResponse.jsonUnsafe(answer(body, token, hits)));
};

const countHit = (state: MockState, token: string): Effect.Effect<number> =>
  Ref.modify(state.hits, (all) => {
    const next = Option.getOrElse(Rec.get(all, token), () => NO_HITS) + FIRST_HIT;
    return [next, { ...all, [token]: next }];
  });

const handler = (
  state: MockState,
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpServerError.HttpServerError | Schema.SchemaError,
  HttpServerRequest.HttpServerRequest
> =>
  Effect.gen(function* handle() {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const json2 = yield* request.json;
    const raw = yield* Schema.decodeUnknownEffect(RawBodySchema)(json2);
    const authorization = Option.getOrElse(
      Option.fromUndefinedOr(request.headers["authorization"]),
      () => "",
    );
    const token = Str.replace("Bearer ", "")(authorization);
    const body = normalized(raw);
    const header = (name: string): string =>
      Option.getOrElse(Option.fromUndefinedOr(request.headers[name]), () => "");
    const app = {
      referer: header("http-referer"),
      title: header("x-openrouter-title"),
      visibility: header("x-openrouter-app-visibility"),
    };
    yield* Ref.update(state.log, (log) => [
      ...log,
      { authorization, app, body, sentState: raw.state },
    ]);
    return yield* Option.match(rejectionOf(raw), {
      onSome: Effect.succeed,
      onNone: () => Effect.flatMap(countHit(state, token), (hits) => replyFor(body, token, hits)),
    });
  });

const MockLive = Layer.effect(
  MockOpenRouter,
  Effect.gen(function* make() {
    const log = yield* Ref.make<readonly LoggedRequest[]>([]);
    const hits = yield* Ref.make<Readonly<Record<string, number>>>({});
    const baseURL = yield* HttpServer.addressFormattedWith((address) =>
      Effect.succeed(`${address}/api/v1`),
    );
    return { log, hits, baseURL };
  }),
);

const routes = Layer.unwrap(
  Effect.gen(function* serve() {
    const state = yield* MockOpenRouter;
    return HttpRouter.serve(HttpRouter.add("POST", "/api/alpha/decisions", handler(state)), {
      disableLogger: true,
      disableListenLog: true,
    });
  }),
);

const MockOpenRouterLayer = routes.pipe(
  Layer.provideMerge(MockLive),
  Layer.provideMerge(NodeHttpServer.layerTest),
);

const loggedRequests: Effect.Effect<readonly LoggedRequest[], TestError, MockOpenRouter> =
  Effect.gen(function* logged() {
    const { log } = yield* MockOpenRouter;
    return yield* Ref.get(log);
  });

/** @internal */
export { MockOpenRouter, MockOpenRouterLayer, loggedRequests };
/** @internal */
export type { LoggedRequest };
