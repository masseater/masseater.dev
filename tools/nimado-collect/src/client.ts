import { Effect, Schedule, pipe } from "effect";
import type { Duration, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

const USER_AGENT = "nimado/0.0 (+https://masseater.dev/nimado/)";
const RETRIES = 3;

/** @internal */
const getJson = Effect.fn("http.get")(function* fetchJson<Codec extends Schema.Constraint>({
  codec,
  url,
  params,
  backoff,
}: Readonly<{
  codec: Codec;
  url: string;
  params: Readonly<Record<string, string>>;
  backoff: Duration.Duration;
}>) {
  const client = yield* HttpClient.HttpClient;
  const request = pipe(
    HttpClientRequest.get(url),
    HttpClientRequest.setUrlParams(params),
    HttpClientRequest.setHeader("User-Agent", USER_AGENT),
    HttpClientRequest.acceptJson,
  );
  const response = yield* client
    .execute(request)
    .pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.retry({ schedule: Schedule.exponential(backoff), times: RETRIES }),
    );
  return yield* HttpClientResponse.schemaBodyJson(codec)(response);
});

export { getJson };
