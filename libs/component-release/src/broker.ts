import { Config, Effect, Option, Redacted, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { mask } from "./actions.ts";

const AUDIENCE = "masseater-dev-credential-broker";
const BROKER = "https://credentials.masseater.dev/";
const RETRIES = 3;
const BACKOFF = "1 second";

const IdToken = Schema.Struct({ value: Schema.String });
const Credentials = Schema.Struct({ githubToken: Schema.optional(Schema.String) });

const idToken = Effect.fn("broker.idToken")(function* idToken() {
  const url = yield* Config.String("ACTIONS_ID_TOKEN_REQUEST_URL");
  const requestToken = yield* Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.bearerToken(
    HttpClientRequest.get(`${url}&audience=${AUDIENCE}`),
    Redacted.value(requestToken),
  );
  const response = yield* Effect.flatMap(
    client.execute(request),
    HttpClientResponse.filterStatusOk,
  );
  const { value } = yield* HttpClientResponse.schemaBodyJson(IdToken)(response);
  yield* mask(value);
  return value;
});

/** @internal */
export const githubToken = Effect.fn("broker.githubToken")(function* githubToken() {
  const oidc = yield* idToken();
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.bearerToken(HttpClientRequest.post(BROKER), oidc);
  const response = yield* Effect.flatMap(
    client.execute(request),
    HttpClientResponse.filterStatusOk,
  ).pipe(Effect.retry({ times: RETRIES, schedule: Schedule.exponential(BACKOFF) }));
  const credentials = yield* HttpClientResponse.schemaBodyJson(Credentials)(response);
  const token = Option.fromUndefinedOr(credentials.githubToken);
  if (Option.isSome(token)) {
    yield* mask(token.value);
  }
  return token;
});
