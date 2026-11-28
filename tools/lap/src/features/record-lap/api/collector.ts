import { Console, Duration, Effect, Option, Schedule } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { ChildProcess } from "effect/process";

import { ENDPOINT, HOST, PORT } from "#/shared/config/endpoint.ts";

const READY_EVERY_MILLIS = 200;
const READY_EVERY = Duration.millis(READY_EVERY_MILLIS);
const READY_ATTEMPTS = 25;
const STOP_AFTER_SECONDS = 10;

const ready = Effect.fn("lap.ready")(function* ready() {
  const http = yield* HttpClient.HttpClient;
  yield* http.execute(HttpClientRequest.post(`${ENDPOINT}/v1/traces`)).pipe(
    Effect.retry({
      schedule: Schedule.spaced(READY_EVERY),
      times: READY_ATTEMPTS,
    }),
    Effect.scoped,
  );
});

const receiverAddress = `receivers::otlp::protocols::http::endpoint=${HOST}:${String(PORT)}`;

const startCollector = Effect.fn("lap.collector")(function* startCollector(
  input: Readonly<{ directory: string; config: string }>,
) {
  const handle = yield* ChildProcess.make(
    "otelcol",
    ["--config", input.config, "--set", receiverAddress],
    {
      env: { OTEL_FILES: input.directory },
      extendEnv: true,
      stdout: "ignore",
      stderr: "ignore",
      killSignal: "SIGINT",
      forceKillAfter: Duration.seconds(STOP_AFTER_SECONDS),
    },
  );
  yield* ready();
  return handle;
});

type Collector = Effect.Success<ReturnType<typeof startCollector>>;

const stopCollector = Effect.fn("lap.stop")(function* stopCollector(collector: Collector) {
  yield* collector.kill({ killSignal: "SIGINT" });
  yield* collector.exitCode;
});

const stopIfStarted = (collector: Option.Option<Collector>): Effect.Effect<void> =>
  Option.match(collector, {
    onNone: () => Effect.void,
    onSome: (started) => stopCollector(started).pipe(Effect.ignore),
  });

/** @internal */
export const withCollector = Effect.fn("lap.withCollector")(function* withCollector<
  Value,
  Failure,
  Services,
>(
  input: Readonly<{ directory: string; config: string }>,
  run: Effect.Effect<Value, Failure, Services>,
) {
  const collector = yield* startCollector(input).pipe(
    Effect.tapError((failure) =>
      Console.error(
        `lap: no OpenTelemetry Collector, so only the time of the command is kept: ${String(failure)}`,
      ),
    ),
    Effect.option,
  );
  return yield* run.pipe(Effect.ensuring(stopIfStarted(collector)));
}, Effect.scoped);
