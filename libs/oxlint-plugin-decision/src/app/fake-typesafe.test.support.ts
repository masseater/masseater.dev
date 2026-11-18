import { layerTest } from "@effect/platform-node/NodeHttpServer";
import { Effect, Layer, Option, Record as Rec, Schema, pipe } from "effect";
import type { Scope } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";

import { BodySchema } from "./mock-body.test.support.ts";
import type { Body, Question } from "./mock-body.test.support.ts";

/** @internal */
export interface Asked {
  readonly question: Question;
  readonly snippet: string;
}

/** @internal */
export type Answerer = (asked: Asked) => unknown;

const FAKE_MODEL = "fake-1";

const answersOf = (body: Body, answer: Answerer): Readonly<Record<string, unknown>> =>
  pipe(
    body.questions,
    Rec.map((question, ref) =>
      answer({
        question,
        snippet: Option.getOrElse(Option.fromUndefinedOr(body.state.snippets[ref]), () => ""),
      }),
    ),
  );

const reply = (
  answer: Answerer,
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> =>
  Effect.gen(function* handle() {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const json = yield* request.json;
    const body = yield* Schema.decodeUnknownEffect(BodySchema)(json);
    return HttpServerResponse.jsonUnsafe({ model: FAKE_MODEL, answers: answersOf(body, answer) });
  }).pipe(Effect.orDie);

/** @internal */
export const fakeTypesafeEnv = (
  answer: Answerer,
): Effect.Effect<Readonly<Record<string, string>>, never, Scope.Scope> =>
  Effect.gen(function* serve() {
    const server = HttpRouter.serve(HttpRouter.add("POST", "/v1/systemone", reply(answer)), {
      disableLogger: true,
      disableListenLog: true,
    }).pipe(Layer.provideMerge(layerTest));
    const context = yield* Layer.build(server);
    const baseURL = yield* HttpServer.addressFormattedWith((address) =>
      Effect.succeed(address),
    ).pipe(Effect.provideContext(context));
    return { TYPESAFE_API_KEY: "fake", TYPESAFE_BASE_URL: baseURL };
  }).pipe(Effect.orDie);

/** @internal */
export const alwaysYes = (): unknown => ({ type: "noul", noul: 0.99 });

/** @internal */
export const FAKE_SETTINGS = { model: "typesafe/jev-latest" } as const;
