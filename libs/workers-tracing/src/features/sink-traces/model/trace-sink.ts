import { Workers } from "@alchemy.run/cloudflare";
import { makeRandom } from "alchemy";
import { map } from "alchemy/Output";
import { Effect, Redacted } from "effect";

import { COMPATIBILITY_DATE } from "#/shared/config/index.ts";

export interface TraceSinkProps {
  readonly destination?: string;
  readonly workerName?: string;
  readonly logpush?: boolean;
  readonly cpuMs?: number;
}

export const DEFAULT_DESTINATION = "workers-tracing";

const DEFAULT_CPU_MS = 1000;

const sinkMain = (): string =>
  decodeURIComponent(
    new URL(import.meta.resolve("@r_masseater/workers-tracing/trace-sink-worker")).pathname,
  );

export const traceSink = Effect.fn("traceSink")(function* traceSink({
  destination = DEFAULT_DESTINATION,
  workerName = `${destination}-sink`,
  logpush = false,
  cpuMs = DEFAULT_CPU_MS,
}: TraceSinkProps = {}) {
  const token = yield* makeRandom("TraceSinkToken");
  const sink = yield* Workers.Worker("TraceSink", {
    name: workerName,
    main: sinkMain(),
    compatibility: { date: COMPATIBILITY_DATE },
    logpush,
    limits: { cpuMs },
    env: { TRACE_SINK_TOKEN: token },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
      traces: { enabled: false },
      issues: { enabled: true },
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
