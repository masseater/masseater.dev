import { Effect, String as Str } from "effect";
import type { Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { WatashiFailed } from "./errors.ts";
import type { JsonError } from "./errors.ts";

type Decodable = Schema.Constraint & { readonly DecodingServices: never };

type Expect<Shape extends Decodable> = Readonly<{ url: string; schema: Shape }>;

const START = 0;
const SHOWN_BODY = 500;
const OK_FIRST = 200;
const OK_LAST = 299;

const unexpected =
  (url: string) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<never, JsonError> =>
    response.text.pipe(
      Effect.flatMap((body) =>
        Effect.fail(
          WatashiFailed.make({
            reason: "Api",
            message: `${url} responded ${String(response.status)}: ${Str.slice(START, SHOWN_BODY)(body)}`,
          }),
        ),
      ),
    );

const okBody =
  <Shape extends Decodable>(expected: Expect<Shape>) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<Shape["Type"], JsonError> => {
    if (response.status >= OK_FIRST && response.status <= OK_LAST) {
      return HttpClientResponse.schemaBodyJson(expected.schema)(response);
    }
    return unexpected(expected.url)(response);
  };

const getJson = <Shape extends Decodable>(
  expected: Expect<Shape>,
): Effect.Effect<Shape["Type"], JsonError, HttpClient.HttpClient> =>
  HttpClient.get(expected.url, { acceptJson: true }).pipe(Effect.flatMap(okBody(expected)));

const postForm = <Shape extends Decodable>(
  request: Expect<Shape> & Readonly<{ form: Readonly<Record<string, string>> }>,
): Effect.Effect<Shape["Type"], JsonError, HttpClient.HttpClient> => {
  const post = HttpClientRequest.post(request.url, { acceptJson: true }).pipe(
    HttpClientRequest.bodyUrlParams(request.form),
  );
  return HttpClient.execute(post).pipe(Effect.flatMap(okBody(request)));
};

const postJson = <Shape extends Decodable>(
  request: Expect<Shape> & Readonly<{ body: unknown }>,
): Effect.Effect<Shape["Type"], JsonError, HttpClient.HttpClient> =>
  HttpClientRequest.post(request.url, { acceptJson: true }).pipe(
    HttpClientRequest.bodyJson(request.body),
    Effect.flatMap(HttpClient.execute),
    Effect.flatMap(okBody(request)),
  );

/** @internal */
export { getJson, okBody, postForm, postJson };
/** @internal */
export type { Decodable, Expect };
