import { runner } from "@r_masseater/workers-tracing/effect";
import { env } from "cloudflare:workers";
import { Effect, Option, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { createAuth } from "#/shared/auth/index.server";
import { SIGN_IN_PATH } from "#/shared/config";

const FIRE_URL =
  "https://api.anthropic.com/v1/claude_code/routines/trig_01NtF1jiT2YNzbviuidNfcRf/fire";
const SEE_OTHER = 303;
const BAD_REQUEST = 400;
const BAD_GATEWAY = 502;

const INSTRUCTION =
  "次のページについて、MCPのwrite_sloppedia_articleでSloppediaの記事を書く。ツールの説明にある百科事典の書き方に従い、ページを読んで出典を付ける。focusとhighlightは持ち主が記事で触れてほしい点である。";

const FIRE_HEADERS = {
  "anthropic-beta": "experimental-cc-routine-2026-04-01",
  "anthropic-version": "2023-06-01",
};

const ScrapRequest = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  highlight: Schema.String,
  focus: Schema.String,
});

const ScrapRequestJson = Schema.fromJsonString(ScrapRequest);

const FireResult = Schema.Struct({ claude_code_session_url: Schema.String });

const signedIn = (request: Request): Effect.Effect<boolean> =>
  Effect.promise(() => createAuth().api.getSession({ headers: request.headers })).pipe(
    Effect.map((session) => session !== null),
  );

const fireRoutine = Effect.fn("fireRoutine")(function* fireRoutine(body: typeof ScrapRequest.Type) {
  const token = yield* Effect.promise(() => env.SCRAP_ROUTINE_TOKEN.get());
  const text = yield* Schema.encodeEffect(ScrapRequestJson)(body);
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(FIRE_URL).pipe(
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.setHeaders(FIRE_HEADERS),
    HttpClientRequest.bodyJsonUnsafe({ text: `${INSTRUCTION}\n${text}` }),
  );
  const response = yield* client
    .execute(request)
    .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  return yield* HttpClientResponse.schemaBodyJson(FireResult)(response);
});

const relay = Effect.fn("relay")(function* relay(request: Request) {
  const text = yield* Effect.promise(() => request.text());
  const body = Schema.decodeOption(ScrapRequestJson)(text);
  if (Option.isNone(body)) {
    return Response.json(
      { error: "url・title・highlight・focus を文字列で送る" },
      { status: BAD_REQUEST },
    );
  }
  return yield* fireRoutine(body.value).pipe(
    Effect.map((result) => Response.json({ sessionUrl: result.claude_code_session_url })),
    Effect.catchCause((cause) =>
      Effect.logError("scrap_request.failed", cause).pipe(
        Effect.as(Response.json({ error: "ルーチンを起動できなかった" }, { status: BAD_GATEWAY })),
      ),
    ),
  );
});

const handle = Effect.fn("scrapRequest")(function* scrapRequest(request: Request) {
  if (!(yield* signedIn(request))) {
    return new Response("", { status: SEE_OTHER, headers: { location: SIGN_IN_PATH } });
  }
  if (request.method !== "POST") {
    return new Response("ログインできています。このタブは閉じてかまいません。", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return yield* relay(request);
});

const serveScrapRequest = (request: Request): Promise<Response> =>
  runner(FetchHttpClient.layer)(handle(request));

export { serveScrapRequest };
