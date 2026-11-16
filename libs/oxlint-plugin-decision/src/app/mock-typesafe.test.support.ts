import { NodeHttpServer } from "@effect/platform-node";
import { Context, Effect, Layer, Option, Record as Rec, Ref, Schema, String as Str } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";
import type { HttpServerError } from "effect/http";

import { FIRST_HIT, NO_HITS, answer, isRefinement } from "./mock-answers.test.support.ts";
import { BodySchema } from "./mock-body.test.support.ts";
import type { Body } from "./mock-body.test.support.ts";
import type { TestError } from "./oxlint.test.support.ts";

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;
const FORBIDDEN = 403;

/** @internal */
export interface LoggedRequest {
  readonly authorization: string;
  readonly body: Body;
}

interface MockState {
  readonly log: Ref.Ref<readonly LoggedRequest[]>;
  readonly hits: Ref.Ref<Readonly<Record<string, number>>>;
}

interface MockShape extends MockState {
  readonly baseURL: string;
}

/** @internal */
export class MockTypesafe extends Context.Service<MockTypesafe, MockShape>()(
  "@r_masseater/oxlint-plugin-decision/app/mock-typesafe.test.support/MockTypesafe",
) {}

const unauthorized = HttpServerResponse.jsonUnsafe(
  { detail: { message: "bad key" } },
  { status: UNAUTHORIZED },
);

const outOfBudget = HttpServerResponse.jsonUnsafe(
  { detail: { message: "Workspace weekly budget of $5.00 exceeded." } },
  { status: FORBIDDEN },
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
  if (token === "out-of-budget") {
    return Effect.succeed(outOfBudget);
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
    const json = yield* request.json;
    const body = yield* Schema.decodeUnknownEffect(BodySchema)(json);
    const authorization = Option.getOrElse(
      Option.fromUndefinedOr(request.headers["authorization"]),
      () => "",
    );
    const token = Str.replace("Bearer ", "")(authorization);
    yield* Ref.update(state.log, (log) => [...log, { authorization, body }]);
    return yield* Effect.flatMap(countHit(state, token), (hits) => replyFor(body, token, hits));
  });

const MockLive = Layer.effect(
  MockTypesafe,
  Effect.gen(function* make() {
    const log = yield* Ref.make<readonly LoggedRequest[]>([]);
    const hits = yield* Ref.make<Readonly<Record<string, number>>>({});
    const baseURL = yield* HttpServer.addressFormattedWith((address) => Effect.succeed(address));
    return { log, hits, baseURL };
  }),
);

const routes = Layer.unwrap(
  Effect.gen(function* serve() {
    const state = yield* MockTypesafe;
    return HttpRouter.serve(HttpRouter.add("POST", "/v1/systemone", handler(state)), {
      disableLogger: true,
      disableListenLog: true,
    });
  }),
);

/** @internal */
export const MockTypesafeLayer = routes.pipe(
  Layer.provideMerge(MockLive),
  Layer.provideMerge(NodeHttpServer.layerTest),
);

/** @internal */
export const loggedRequests: Effect.Effect<readonly LoggedRequest[], TestError, MockTypesafe> =
  Effect.gen(function* logged() {
    const { log } = yield* MockTypesafe;
    return yield* Ref.get(log);
  });
