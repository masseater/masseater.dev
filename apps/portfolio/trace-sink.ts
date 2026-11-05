import { Workers } from "@alchemy.run/cloudflare";
import { makeRandom } from "alchemy";
import { map } from "alchemy/Output";
import { Effect, Redacted } from "effect";

import { APP_NAME, TRACE_DESTINATION } from "./app-name.ts";

type TraceSinkEnv = Readonly<{ TRACE_SINK_TOKEN: string }>;

const traceSink = Effect.fn("traceSink")(function* traceSink(
  compatibility: Readonly<{ date: string }>,
) {
  const token = yield* makeRandom("TraceSinkToken");
  const sink = yield* Workers.Worker("TraceSink", {
    name: `${APP_NAME}-trace-sink`,
    main: "./trace-sink.worker.ts",
    compatibility,
    logpush: true,
    env: { TRACE_SINK_TOKEN: token },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
    },
  });
  return yield* Workers.ObservabilityDestination("Traces", {
    name: TRACE_DESTINATION,
    url: map(sink.url, (url) => new URL("/v1/traces", url).href),
    headers: {
      authorization: map(token, (value) => Redacted.make(`Bearer ${Redacted.value(value)}`)),
    },
    logpushDataset: "opentelemetry-traces",
  });
});

export type { TraceSinkEnv };
export { traceSink };
