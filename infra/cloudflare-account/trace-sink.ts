import { Workers } from "@alchemy.run/cloudflare";
import { makeRandom } from "alchemy";
import { map } from "alchemy/Output";
import { Effect, Redacted } from "effect";

import type { Compatibility } from "./compatibility.ts";

type TraceSinkEnv = Readonly<{ TRACE_SINK_TOKEN: string }>;

type TraceSinkProps = Readonly<{
  appName: string;
  destination: string;
  compatibility: Compatibility;
}>;

const traceSink = Effect.fn("traceSink")(function* traceSink({
  appName,
  destination,
  compatibility,
}: TraceSinkProps) {
  const token = yield* makeRandom("TraceSinkToken");
  const sink = yield* Workers.Worker("TraceSink", {
    name: `${appName}-trace-sink`,
    main: decodeURIComponent(new URL("trace-sink.worker.ts", import.meta.url).pathname),
    compatibility,
    logpush: true,
    env: { TRACE_SINK_TOKEN: token },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
    },
  });
  return yield* Workers.ObservabilityDestination("Traces", {
    name: destination,
    url: map(sink.url, (url) => new URL("/v1/traces", url).href),
    headers: {
      authorization: map(token, (value) => Redacted.make(`Bearer ${Redacted.value(value)}`)),
    },
    logpushDataset: "opentelemetry-traces",
  });
});

export type { TraceSinkEnv, TraceSinkProps };
export { traceSink };
