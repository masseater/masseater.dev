#!/usr/bin/env node
import { createAiGateway, deleteAiGateway } from "@distilled.cloud/cloudflare/ai-gateway";
import { runMainWith } from "@r_masseater/node-main";
import {
  Array as Arr,
  Config,
  Console,
  Duration,
  Effect,
  Redacted,
  Schema,
  Stream,
  pipe,
} from "effect";
import { HttpBody, HttpClient, HttpClientRequest } from "effect/http";

import { cloudflare } from "./lib/cloudflare.ts";

const GATEWAY_ID = "cap-check";

const SPEND_LIMIT_DOLLARS = 1e-6;

const WINDOW_SECONDS = 86_400;

const MODEL = "@cf/baai/bge-m3";

const MAX_CALLS = 40;

const PAUSE_SECONDS = 3;

const PAUSE = Duration.seconds(PAUSE_SECONDS);

const FIRST_CALL = 1;

const DISABLED = 0;

const METADATA = '{"tool":"verify-gateway-cap"}';

const WORDS_PER_CALL = 1500;

const BLOCKED = 429;

const taggedError = Schema.TaggedError;

class CapNotReached extends taggedError<CapNotReached, { readonly brand: unique symbol }>()(
  "CapNotReached",
  { message: Schema.String },
) {}

const text = pipe(Arr.replicate("gateway", WORDS_PER_CALL), Arr.join(" "));

const callOnce = Effect.fn("callOnce")(function* callOnce(accountId: string, call: number) {
  const token = yield* Config.Redacted("CLOUDFLARE_API_TOKEN");
  const request = pipe(
    HttpClientRequest.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    ),
    HttpClientRequest.setHeaders({
      authorization: `Bearer ${Redacted.value(token)}`,
      "cf-aig-gateway-id": GATEWAY_ID,
      "cf-aig-metadata": METADATA,
    }),
    HttpClientRequest.setBody(HttpBody.jsonUnsafe({ text })),
  );
  const response = yield* HttpClient.execute(request);
  yield* Console.log(`call ${call}: ${response.status}`);
  return response.status;
});

const callUntilBlocked = Effect.fn("callUntilBlocked")(function* callUntilBlocked(
  accountId: string,
) {
  return yield* Stream.fromIterable(Arr.range(FIRST_CALL, MAX_CALLS)).pipe(
    Stream.mapEffect((call) => callOnce(accountId, call).pipe(Effect.delay(PAUSE))),
    Stream.takeUntil((status) => status === BLOCKED),
    Stream.runCollect,
  );
});

const verifyGatewayCap = Effect.gen(function* verifyGatewayCap() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const recorded = yield* Effect.acquireUseRelease(
    createAiGateway({
      accountId,
      id: GATEWAY_ID,
      authentication: true,
      cacheInvalidateOnUpdate: false,
      cacheTtl: DISABLED,
      collectLogs: true,
      rateLimitingInterval: DISABLED,
      rateLimitingLimit: DISABLED,
      spendLimits: {
        enabled: true,
        rules: [
          {
            limitType: "cost",
            limit: SPEND_LIMIT_DOLLARS,
            window: WINDOW_SECONDS,
            technique: "sliding",
            enabled: true,
          },
        ],
      },
    }),
    () => callUntilBlocked(accountId),
    () => deleteAiGateway({ accountId, id: GATEWAY_ID }).pipe(Effect.ignore),
  );
  const statuses = Arr.fromIterable(recorded);
  yield* Console.log(`statuses: ${pipe(statuses, Arr.map(String), Arr.join(","))}`);
  yield* Effect.filterOrFail(Effect.succeed(statuses), Arr.contains(BLOCKED), () =>
    CapNotReached.make({ message: "the spend limit never returned 429" }),
  );
  yield* Console.log("the spend limit returned 429");
});

runMainWith({ serviceName: "verify-gateway-cap", services: cloudflare })(verifyGatewayCap);
