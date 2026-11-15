#!/usr/bin/env node
import { Credentials } from "@distilled.cloud/github/Credentials";
import { fail, mask, setEnv } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Config, Effect, Option, Redacted, Schedule, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { CREDENTIAL_BROKER_AUDIENCE } from "./broker-names.ts";
import { installedRepositories } from "./installed-repositories.ts";

const BROKER = "https://credentials.masseater.dev/?only=github";
const GITHUB_API = "https://api.github.com";
const USER_AGENT = "masseater.dev";
const RETRIES = 3;
const MISSING_FROM_BROKER =
  "The credential broker returned no GitHub token: check https://credentials.masseater.dev/github-app and the broker logs";

const IdToken = Schema.Struct({ value: Schema.String });
const Issued = Schema.Struct({ githubToken: Schema.optional(Schema.String) });

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

const issue = Effect.fn("issue")(function* issue(oidc: string) {
  const request = HttpClientRequest.post(BROKER).pipe(HttpClientRequest.bearerToken(oidc));
  const response = yield* send(request).pipe(Effect.retry(Schedule.recurs(RETRIES)));
  const { githubToken } = yield* HttpClientResponse.schemaBodyJson(Issued)(response);
  return Option.fromNullishOr(githubToken);
});

const maskPrivateNames = Effect.fn("maskPrivateNames")(function* maskPrivateNames(token: string) {
  const credentials = Effect.succeed({
    token: Redacted.make(token),
    apiBaseUrl: GITHUB_API,
    userAgent: USER_AGENT,
  });
  const repositories = yield* installedRepositories.pipe(
    Effect.provideService(Credentials, credentials),
  );
  const hidden = pipe(
    repositories,
    Arr.filter((repository) => repository.private && !repository.archived),
  );
  yield* Effect.forEach(hidden, ({ name }) => mask(name), { discard: true });
});

const brokerGitHubToken = Effect.gen(function* brokerGitHubToken() {
  const oidc = yield* idToken;
  yield* mask(oidc);
  const issued = yield* issue(oidc);
  const token = yield* Option.match(issued, {
    onNone: () => fail(MISSING_FROM_BROKER),
    onSome: Effect.succeed,
  });
  yield* mask(token);
  yield* maskPrivateNames(token);
  yield* setEnv({ GITHUB_TOKEN: token });
});

runMain("broker-github-token")(brokerGitHubToken);
