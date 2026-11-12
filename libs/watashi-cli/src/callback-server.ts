import { createServer } from "node:http";

import { NodeHttpServer } from "@effect/platform-node";
import { Deferred, Effect, Option, Record as Rec } from "effect";
import type { Scope } from "effect";
import { HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";

import { WatashiFailed } from "./errors.ts";

type Callback = Readonly<{ redirectUri: string; code: Effect.Effect<string, WatashiFailed> }>;

const LOOPBACK = "127.0.0.1";
const CALLBACK_PATH = "/callback";
const ANY_FREE_PORT = 0;
const NOT_FOUND = 404;
const LOGIN_TIMEOUT = "10 minutes";

const loginFailed = (message: string): WatashiFailed =>
  WatashiFailed.make({ reason: "Login", message });

const respond =
  (expectedState: string, code: Deferred.Deferred<string, WatashiFailed>) =>
  (
    query: Readonly<Record<string, string>>,
  ): Effect.Effect<HttpServerResponse.HttpServerResponse> => {
    const failure = Rec.get(query, "error");
    const received = Rec.get(query, "code");
    if (Option.isSome(failure) || Option.isNone(received) || query["state"] !== expectedState) {
      const why = Option.getOrElse(failure, () => "state mismatch");
      return Deferred.fail(code, loginFailed(`authorization failed: ${why}`)).pipe(
        Effect.as(HttpServerResponse.text("ログインできませんでした。ターミナルを見てください。")),
      );
    }
    return Deferred.succeed(code, received.value).pipe(
      Effect.as(HttpServerResponse.text("ログインできました。このタブは閉じてかまいません。")),
    );
  };

const handlerOf = (
  expectedState: string,
  code: Deferred.Deferred<string, WatashiFailed>,
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> =>
  Effect.gen(function* handle() {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const url = new URL(request.url, `http://${LOOPBACK}`);
    if (url.pathname !== CALLBACK_PATH) {
      return HttpServerResponse.empty({ status: NOT_FOUND });
    }
    return yield* respond(expectedState, code)(Rec.fromEntries(url.searchParams));
  });

const listenForCode = (expectedState: string): Effect.Effect<Callback, never, Scope.Scope> =>
  Effect.gen(function* listen() {
    const code = yield* Deferred.make<string, WatashiFailed>();
    const server = yield* Effect.orDie(
      NodeHttpServer.make(() => createServer(), { port: ANY_FREE_PORT, host: LOOPBACK }),
    );
    yield* server.serve(handlerOf(expectedState, code));
    return {
      redirectUri: `${HttpServer.formatAddress(server.address)}${CALLBACK_PATH}`,
      code: Deferred.await(code).pipe(
        Effect.timeoutOrElse({
          duration: LOGIN_TIMEOUT,
          orElse: () => Effect.fail(loginFailed("login timed out")),
        }),
      ),
    };
  });

/** @internal */
export { listenForCode };
/** @internal */
export type { Callback };
