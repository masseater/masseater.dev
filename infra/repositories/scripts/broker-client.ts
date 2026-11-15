import { Config, Effect, Option, Redacted, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { CREDENTIAL_BROKER_AUDIENCE } from "#broker-names";

const BROKER = "https://credentials.masseater.dev/";
const RETRIES = 3;

const IdToken = Schema.Struct({ value: Schema.String });

const send = Effect.fn("send")(function* send(request: HttpClientRequest.HttpClientRequest) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.execute(request);
  return yield* HttpClientResponse.filterStatusOk(response);
});

const idToken = Effect.gen(function* idToken() {
  const url = yield* Config.String("ACTIONS_ID_TOKEN_REQUEST_URL");
  const requestToken = yield* Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const request = HttpClientRequest.get(`${url}&audience=${CREDENTIAL_BROKER_AUDIENCE}`).pipe(
    HttpClientRequest.bearerToken(Redacted.value(requestToken)),
  );
  const response = yield* send(request);
  const { value } = yield* HttpClientResponse.schemaBodyJson(IdToken)(response);
  return value;
});

const issuedBy = Effect.fn("issuedBy")(function* issuedBy(
  request: Readonly<{ only: string; field: string; oidc: string }>,
) {
  const post = HttpClientRequest.post(`${BROKER}?only=${request.only}`).pipe(
    HttpClientRequest.bearerToken(request.oidc),
  );
  const response = yield* send(post).pipe(Effect.retry(Schedule.recurs(RETRIES)));
  const body = yield* HttpClientResponse.schemaBodyJson(
    Schema.Record(Schema.String, Schema.Unknown),
  )(response);
  return Option.filter(
    Option.fromNullishOr(body[request.field]),
    (value): value is string => typeof value === "string" && value !== "",
  );
});

/** @internal */
const brokerIdToken = idToken;

/** @internal */
const issued = issuedBy;

export { brokerIdToken, issued };
