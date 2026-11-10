import { Array as Arr, Effect, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { securedResponse, securedResult } from "./response.ts";

type Summary = Readonly<{
  status: number;
  body: string;
  cookies: readonly string[];
  headers: Readonly<Record<string, string>>;
}>;

const SERVER_HEADERS = {
  "content-security-policy": "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const CROSS_ORIGIN_HEADERS = [
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Embedder-Policy",
  "Cross-Origin-Resource-Policy",
];

const CREATED = 201;

const FOUND = 302;

const CALLBACK = "https://client.example/callback?code=1";

const CHUNKS = ["<p>前半</p>", "<p>後半</p>"];

const COOKIES = ["session=a; Path=/", "state=b; Path=/"];

const EMPTY = new Uint8Array();

const encoder = new TextEncoder();

const streamed = (): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start: (controller) => {
      for (const chunk of CHUNKS) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

const immutable = (response: Response): Response =>
  Object.defineProperty(response, "headers", { value: Response.error().headers });

const headersOf = (response: Response): Readonly<Record<string, string>> =>
  pipe(Rec.fromEntries(response.headers), Rec.remove("set-cookie"));

const summarize = (response: Response): Effect.Effect<Summary> =>
  Effect.promise(() => response.text()).pipe(
    Effect.map((body) => ({
      status: response.status,
      body,
      cookies: response.headers.getSetCookie(),
      headers: headersOf(response),
    })),
  );

const secured = (response: Response): Effect.Effect<Response> =>
  Effect.promise(() => securedResponse(() => response));

const securedFromResult = (response: Response): Effect.Effect<Response> =>
  Effect.promise(() => securedResult(() => Promise.resolve({ response, pathname: "/" })));

const crossOriginHeadersOf = (response: Response): readonly string[] =>
  pipe(
    CROSS_ORIGIN_HEADERS,
    Arr.filter((name) => response.headers.has(name)),
  );

const headersAfter = (response: Response): Promise<Readonly<Record<string, string>>> =>
  Effect.runPromise(Effect.map(secured(response), headersOf));

const crossOriginHeadersAfter = (response: Response): Promise<readonly string[]> =>
  Effect.runPromise(Effect.map(secured(response), crossOriginHeadersOf));

const summaryAfter = (response: Response): Promise<Summary> =>
  Effect.runPromise(Effect.flatMap(secured(response), summarize));

const resultHeadersAfter = (response: Response): Promise<Readonly<Record<string, string>>> =>
  Effect.runPromise(Effect.map(securedFromResult(response), headersOf));

test("ヘッダの無い応答には、サーバーの応答向けの 6 つのヘッダだけを付ける", () =>
  expect(headersAfter(new Response())).resolves.toStrictEqual(SERVER_HEADERS));

test("COOP・COEP・CORP は付けない", () =>
  expect(crossOriginHeadersAfter(new Response())).resolves.toStrictEqual([]));

test("応答がすでに持つヘッダは書き換えず、無いものだけを足す", () => {
  const response = new Response(EMPTY, {
    headers: { "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "default-src 'self'" },
  });
  return expect(headersAfter(response)).resolves.toStrictEqual({
    ...SERVER_HEADERS,
    "x-frame-options": "SAMEORIGIN",
    "content-security-policy": "default-src 'self'",
  });
});

test("ヘッダを書き換えられる応答は、作り直さず同じ応答のまま返す", () => {
  const response = new Response("ok");
  return expect(securedResponse(() => response)).resolves.toBe(response);
});

test("ストリームの本文とステータスを保つ", () => {
  const response = new Response(streamed(), { status: CREATED });
  return expect(summaryAfter(response)).resolves.toStrictEqual({
    status: CREATED,
    body: Arr.join(CHUNKS, ""),
    cookies: [],
    headers: SERVER_HEADERS,
  });
});

test("302 のリダイレクトは、ステータス・Location・Set-Cookie を保つ", () => {
  const response = new Response(EMPTY, {
    status: FOUND,
    headers: [
      ["Location", CALLBACK],
      ...pipe(
        COOKIES,
        Arr.map((cookie): [string, string] => ["Set-Cookie", cookie]),
      ),
    ],
  });
  return expect(summaryAfter(response)).resolves.toStrictEqual({
    status: FOUND,
    body: "",
    cookies: COOKIES,
    headers: { ...SERVER_HEADERS, location: CALLBACK },
  });
});

test("ヘッダを書き換えられないリダイレクトは、ステータスと Location を保って作り直す", () => {
  const response = Response.redirect(CALLBACK, FOUND);
  return expect(summaryAfter(response)).resolves.toStrictEqual({
    status: FOUND,
    body: "",
    cookies: [],
    headers: { ...SERVER_HEADERS, location: CALLBACK },
  });
});

test("ヘッダを書き換えられない応答は、ストリームの本文とステータスを保って作り直す", () => {
  const response = immutable(new Response(streamed(), { status: CREATED }));
  return expect(summaryAfter(response)).resolves.toStrictEqual({
    status: CREATED,
    body: Arr.join(CHUNKS, ""),
    cookies: [],
    headers: SERVER_HEADERS,
  });
});

test("元の処理が失敗したら、同じエラーで失敗する", () => {
  const failure = new Error("handler failed");
  return expect(securedResponse(() => Promise.reject(failure))).rejects.toBe(failure);
});

test("TanStack Start の next の結果から応答を取り出して、ヘッダを付ける", () =>
  expect(resultHeadersAfter(new Response())).resolves.toStrictEqual(SERVER_HEADERS));

test("ルーターのリダイレクトが応答に持たせた値を落とさない", () => {
  const redirect = Object.assign(new Response(EMPTY, { status: FOUND }), {
    options: { to: "/sign-in" },
  });
  return expect(securedResult(() => ({ response: redirect }))).resolves.toBe(redirect);
});
