import { Array as Arr, Duration, Effect, Match, Option, Predicate, Schedule, pipe } from "effect";
import type { Cause } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import type { HttpClientError } from "effect/http";

import { MCP_LIST_TOOLS } from "./probes.ts";
import type { Probe, ProbeOutcome, ProbeResult } from "./probes.ts";

const TIMEOUT = Duration.fromInputUnsafe("20 seconds");
const BACKOFF = Duration.fromInputUnsafe("1 second");
const RETRIES = 3;
const CONCURRENCY = 8;
const DNS_MISSING = "ENOTFOUND";
const MCP_ACCEPT = "application/json, text/event-stream";

const links = (value: unknown, field: string): readonly unknown[] =>
  Option.match(Option.liftPredicate(value, Predicate.hasProperty(field)), {
    onNone: () => [],
    onSome: (holder) => [holder[field]],
  });

const chain = (value: unknown): readonly unknown[] => [
  value,
  ...pipe(links(value, "reason"), Arr.flatMap(chain)),
  ...pipe(links(value, "cause"), Arr.flatMap(chain)),
];

const isDnsMissing = (error: unknown): boolean =>
  pipe(
    chain(error),
    Arr.some((link) => Predicate.hasProperty(link, "code") && link.code === DNS_MISSING),
  );

const requestOf = (probe: Probe): HttpClientRequest.HttpClientRequest =>
  Match.value(probe).pipe(
    Match.when({ method: "GET" }, ({ url }) => HttpClientRequest.get(url)),
    Match.when({ purpose: "mcp" }, ({ url }) =>
      pipe(
        HttpClientRequest.post(url),
        HttpClientRequest.setHeader("accept", MCP_ACCEPT),
        HttpClientRequest.bodyText(MCP_LIST_TOOLS, "application/json"),
      ),
    ),
    Match.orElse(({ url }) => HttpClientRequest.post(url)),
  );

const answer = (
  probe: Probe,
): Effect.Effect<
  ProbeOutcome,
  HttpClientError.HttpClientError | Cause.TimeoutError,
  HttpClient.HttpClient
> =>
  Effect.gen(function* answerProbe() {
    const client = yield* HttpClient.HttpClient;
    const response = yield* HttpClient.withScope(client)
      .execute(requestOf(probe))
      .pipe(Effect.timeout(TIMEOUT));
    const location = Option.getOrElse(Option.fromNullishOr(response.headers["location"]), () => "");
    return { _tag: "Answered", status: response.status, location } satisfies ProbeOutcome;
  }).pipe(Effect.scoped);

const failedOutcome = (error: unknown): ProbeOutcome =>
  Option.match(Option.liftPredicate(error, isDnsMissing), {
    onNone: () => ({ _tag: "Unreachable", reason: String(error) }),
    onSome: () => ({ _tag: "Gone" }),
  });

const outcomeOf = (probe: Probe): Effect.Effect<ProbeOutcome, never, HttpClient.HttpClient> =>
  answer(probe).pipe(
    Effect.retry({
      while: (error) => !isDnsMissing(error),
      times: RETRIES,
      schedule: Schedule.exponential(BACKOFF),
    }),
    Effect.match({ onFailure: failedOutcome, onSuccess: (outcome) => outcome }),
    Effect.withSpan("exposure.probe", { attributes: { "http.request.method": probe.method } }),
  );

const resultOf = (probe: Probe): Effect.Effect<ProbeResult, never, HttpClient.HttpClient> =>
  Effect.map(outcomeOf(probe), (outcome) => ({ probe, outcome }));

const probeAll = (
  probes: readonly Probe[],
): Effect.Effect<readonly ProbeResult[], never, HttpClient.HttpClient> =>
  Effect.forEach(probes, resultOf, { concurrency: CONCURRENCY });

/** @internal */
const runProbes = probeAll;

export { runProbes };
