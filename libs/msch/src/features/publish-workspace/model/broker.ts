import { mask } from "@masseater.dev/github-workflow";
import { Config, Console, Effect, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

const BROKER = "https://credentials.masseater.dev/";
const AUDIENCE = "masseater-dev-credential-broker";

const IdToken = Schema.Struct({ value: Schema.String });
const Issued = Schema.Record(Schema.String, Schema.Unknown);

/** @internal */
export interface Credential {
  readonly kind: string;
  readonly field: string;
}

const oidcToken = Effect.fn("publish.oidc")(function* oidcToken(
  requestUrl: string,
  requestToken: Redacted.Redacted,
) {
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.get(`${requestUrl}&audience=${AUDIENCE}`).pipe(
    HttpClientRequest.bearerToken(Redacted.value(requestToken)),
  );
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const { value } = yield* HttpClientResponse.schemaBodyJson(IdToken)(response);
  yield* mask(value);
  return value;
});

const issued = Effect.fn("publish.issued")(function* issued(
  oidc: string,
  { kind, field }: Credential,
) {
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(`${BROKER}?only=${kind}`).pipe(
    HttpClientRequest.bearerToken(oidc),
  );
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const body = yield* HttpClientResponse.schemaBodyJson(Issued)(response);
  const token = Option.filter(
    Option.fromNullishOr(body[field]),
    (value): value is string => typeof value === "string" && value !== "",
  );
  yield* Effect.forEach(Option.toArray(token), mask, { concurrency: 1, discard: true });
  return token;
});

/** @internal */
export const brokerCredential = Effect.fn("publish.brokerCredential")(function* brokerCredential(
  credential: Credential,
) {
  const requestUrl = yield* Config.option(Config.String("ACTIONS_ID_TOKEN_REQUEST_URL"));
  const requestToken = yield* Config.option(Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN"));
  if (Option.isNone(requestUrl) || Option.isNone(requestToken)) {
    return Option.none<string>();
  }
  return yield* oidcToken(requestUrl.value, requestToken.value).pipe(
    Effect.flatMap((oidc) => issued(oidc, credential)),
    Effect.tapError(() => Console.log(`The credential broker gave no ${credential.field}`)),
    Effect.orElseSucceed(() => Option.none<string>()),
  );
});
