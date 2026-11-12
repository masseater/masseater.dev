import { make as makeOpenRouter } from "@effect/ai-openrouter/OpenRouterClient";
import { Config, Effect, Option, Schedule } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";

import { openRouterApp } from "./openrouter-app.ts";
import { envNameOf } from "./runtime.ts";
import type { DecideInput } from "./types.ts";
import type { WireRequest } from "./wire.ts";

const TOOL = "oxlint-plugin-decision";
const API_PATH = "/api/v1";
const RETRY_INITIAL_MS = 10;
const RETRY_EXPONENT = 2;

const attribution = openRouterApp(TOOL).pipe(Effect.cached, Effect.runSync);

interface FailureReason {
  readonly message: string;
  readonly http?: { readonly response?: { readonly status: number } | undefined } | undefined;
}

const reasonFor = ({ message, http }: FailureReason): string =>
  Option.fromUndefinedOr(http).pipe(
    Option.flatMap(({ response }) => Option.fromUndefinedOr(response)),
    Option.match({
      onSome: ({ status }) => `http ${String(status)}: ${message}`,
      onNone: () => `network: ${message}`,
    }),
  );

const send = Effect.fn("send")(function* send(
  endpoint: string,
  decisionsRequest: WireRequest,
  { env }: Pick<DecideInput, "env">,
) {
  const apiKey = yield* Config.Redacted(envNameOf(env, "OPENROUTER_API_KEY"));
  const headers = yield* attribution;
  const client = yield* makeOpenRouter({
    apiKey,
    apiUrl: `${endpoint}${API_PATH}`,
    transformClient: (http) =>
      http.pipe(
        HttpClient.mapRequest(HttpClientRequest.setHeaders(headers)),
        HttpClient.retryTransient({
          retryOn: "response-only",
          schedule: Schedule.exponential(RETRY_INITIAL_MS, RETRY_EXPONENT),
        }),
      ),
  });
  const [body] = yield* client
    .createDecisions(decisionsRequest)
    .pipe(Effect.mapError(({ reason }) => reasonFor(reason)));
  return body;
});

/** @internal */
export { send };
