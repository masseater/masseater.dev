import { Config, Effect, Redacted } from "effect";
import type { Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpBody, HttpClientError } from "effect/http";

const API = "https://api.github.com";
const HEADERS = {
  accept: "application/vnd.github+json",
  "user-agent": "masseater.dev",
  "x-github-api-version": "2022-11-28",
};

type Failure = Config.ConfigError | HttpBody.HttpBodyError | HttpClientError.HttpClientError;

type Sent<Success> = Effect.Effect<Success, Failure, HttpClient.HttpClient>;

const requestTo = Effect.fn("requestTo")(function* requestTo(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const token = yield* Config.Redacted("GH_TOKEN");
  return HttpClientRequest.make(method)(`${API}/repos/${repository}/${path}`).pipe(
    HttpClientRequest.bearerToken(Redacted.value(token)),
    HttpClientRequest.setHeaders(HEADERS),
  );
});

const execute = Effect.fn("execute")(function* execute(
  request: HttpClientRequest.HttpClientRequest,
) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.execute(request);
  return yield* HttpClientResponse.filterStatusOk(response);
});

const sendBody = Effect.fn("sendBody")(function* sendBody(
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
) {
  const request = yield* requestTo(method, path);
  const filled = yield* HttpClientRequest.bodyJson(request, body);
  return yield* execute(filled);
});

const withBody = (method: "POST" | "PATCH", path: string, body: unknown): Sent<void> =>
  sendBody(method, path, body).pipe(Effect.asVoid);

const getJsonOf =
  <Codec extends Schema.Constraint>(schema: Codec) =>
  (
    path: string,
  ): Effect.Effect<
    Codec["Type"],
    Failure | Schema.SchemaError,
    HttpClient.HttpClient | Codec["DecodingServices"]
  > =>
    requestTo("GET", path).pipe(
      Effect.flatMap(execute),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
    );

const postJsonOf =
  <Codec extends Schema.Constraint>(schema: Codec) =>
  ({
    path,
    body,
  }: Write): Effect.Effect<
    Codec["Type"],
    Failure | Schema.SchemaError,
    HttpClient.HttpClient | Codec["DecodingServices"]
  > =>
    sendBody("POST", path, body).pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)));

const removeAt = (path: string): Sent<void> =>
  requestTo("DELETE", path).pipe(Effect.flatMap(execute), Effect.asVoid);

interface Write {
  readonly path: string;
  readonly body: unknown;
}

const postTo = ({ path, body }: Write): Sent<void> => withBody("POST", path, body);

const patchAt = ({ path, body }: Write): Sent<void> => withBody("PATCH", path, body);

/** @internal */
export const getJson = getJsonOf;

/** @internal */
export const remove = removeAt;

/** @internal */
export const post = postTo;

/** @internal */
export const patch = patchAt;

/** @internal */
export const postJson = postJsonOf;
