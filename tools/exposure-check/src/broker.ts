import { Ledger, Report, ReportOutcome } from "@masseater.dev/exposure-protocol";
import type { LedgerEntryValue } from "@masseater.dev/exposure-protocol";
import { Array as Arr, Config, Effect, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpBody, HttpClientError } from "effect/http";

import type { Surface } from "./surface.ts";

const BROKER = "https://credentials.masseater.dev";
const AUDIENCE = "masseater-dev-credential-broker";

const IdToken = Schema.Struct({ value: Schema.String });

type BrokerError =
  | Config.ConfigError
  | HttpBody.HttpBodyError
  | HttpClientError.HttpClientError
  | Schema.SchemaError;

type Posted<
  Body extends Schema.Codec<unknown, unknown>,
  Answer extends Schema.Codec<unknown, unknown>,
> = Readonly<{
  path: string;
  body: Body;
  value: Body["Type"];
  answer: Answer;
}>;

const idToken = Effect.gen(function* requestIdToken() {
  const url = yield* Config.String("ACTIONS_ID_TOKEN_REQUEST_URL");
  const token = yield* Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const client = yield* HttpClient.HttpClient;
  const request = pipe(
    HttpClientRequest.get(url),
    HttpClientRequest.setUrlParam("audience", AUDIENCE),
    HttpClientRequest.bearerToken(token),
  );
  const response = yield* client
    .execute(request)
    .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  const { value } = yield* HttpClientResponse.schemaBodyJson(IdToken)(response);
  return value;
});

const post = <
  Body extends Schema.Codec<unknown, unknown>,
  Answer extends Schema.Codec<unknown, unknown>,
>({
  path,
  body,
  value,
  answer,
}: Posted<Body, Answer>): Effect.Effect<Answer["Type"], BrokerError, HttpClient.HttpClient> =>
  Effect.gen(function* postToBroker() {
    const client = yield* HttpClient.HttpClient;
    const oidc = yield* idToken;
    const request = yield* pipe(
      HttpClientRequest.post(`${BROKER}${path}`),
      HttpClientRequest.bearerToken(oidc),
      HttpClientRequest.schemaBodyJson(body)(value),
    );
    const response = yield* client
      .execute(request)
      .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
    return yield* HttpClientResponse.schemaBodyJson(answer)(response);
  });

const entriesOf =
  (kind: LedgerEntryValue["kind"]) =>
  (keys: readonly string[]): readonly LedgerEntryValue[] =>
    pipe(
      keys,
      Arr.map((key) => ({ kind, key })),
    );

const entries = (surface: Surface): readonly LedgerEntryValue[] => [
  ...entriesOf("host")(surface.hosts),
  ...entriesOf("worker")(surface.workers),
  ...entriesOf("repository")(surface.repositories),
];

const keysOf =
  (all: readonly LedgerEntryValue[]) =>
  (kind: LedgerEntryValue["kind"]): readonly string[] =>
    pipe(
      all,
      Arr.filter((entry) => entry.kind === kind),
      Arr.map((entry) => entry.key),
    );

const surfaceOf = ({ entries: all }: typeof Ledger.Type): Surface => ({
  hosts: keysOf(all)("host"),
  workers: keysOf(all)("worker"),
  repositories: keysOf(all)("repository"),
});

const rememberSurface = (
  observed: Surface,
): Effect.Effect<Surface, BrokerError, HttpClient.HttpClient> =>
  post({
    path: "/exposure/ledger",
    body: Ledger,
    value: { entries: entries(observed) },
    answer: Ledger,
  }).pipe(Effect.map(surfaceOf), Effect.withSpan("exposure.remember"));

const reportFindings = (
  findings: (typeof Report.Type)["findings"],
): Effect.Effect<typeof ReportOutcome.Type, BrokerError, HttpClient.HttpClient> =>
  post({ path: "/exposure/report", body: Report, value: { findings }, answer: ReportOutcome }).pipe(
    Effect.withSpan("exposure.report"),
  );

/** @internal */
const remember = rememberSurface;

/** @internal */
const report = reportFindings;

export { remember, report };
