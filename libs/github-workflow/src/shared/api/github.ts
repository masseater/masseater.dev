import { Config, Effect, Redacted } from "effect";
import type { Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpBody, HttpClientError, HttpMethod } from "effect/http";

const API = "https://api.github.com";
const HEADERS = {
  accept: "application/vnd.github+json",
  "user-agent": "masseater.dev",
  "x-github-api-version": "2022-11-28",
};

/** @internal */
export type GitHubFailure =
  | Config.ConfigError
  | HttpBody.HttpBodyError
  | HttpClientError.HttpClientError;

/** @internal */
export type GitHubRequest<Success> = Effect.Effect<Success, GitHubFailure, HttpClient.HttpClient>;

const requestTo = Effect.fn("requestTo")(function* requestTo(
  method: HttpMethod.HttpMethod,
  path: string,
) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const token = yield* Config.Redacted("GH_TOKEN").pipe(
    Config.orElse(() => Config.Redacted("GITHUB_TOKEN")),
  );
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

const withBody = Effect.fn("withBody")(function* withBody(
  method: HttpMethod.HttpMethod.WithBody,
  path: string,
  body: unknown,
) {
  const request = yield* requestTo(method, path);
  const filled = yield* HttpClientRequest.bodyJson(request, body);
  return yield* execute(filled);
});

const getJsonOf =
  <Codec extends Schema.Constraint>(schema: Codec) =>
  (
    path: string,
  ): Effect.Effect<
    Codec["Type"],
    GitHubFailure | Schema.SchemaError,
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
  }: GitHubWrite): Effect.Effect<
    Codec["Type"],
    GitHubFailure | Schema.SchemaError,
    HttpClient.HttpClient | Codec["DecodingServices"]
  > =>
    withBody("POST", path, body).pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)));

const removeAt = (path: string): GitHubRequest<void> =>
  requestTo("DELETE", path).pipe(Effect.flatMap(execute), Effect.asVoid);

/** @internal */
export interface GitHubWrite {
  readonly path: string;
  readonly body: unknown;
}

const postTo = ({ path, body }: GitHubWrite): GitHubRequest<void> =>
  withBody("POST", path, body).pipe(Effect.asVoid);

const patchAt = ({ path, body }: GitHubWrite): GitHubRequest<void> =>
  withBody("PATCH", path, body).pipe(Effect.asVoid);

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
