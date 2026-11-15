import { Array, Duration, Effect, Option, Predicate, Schedule, Schema, pipe } from "effect";
import type { Plugin } from "vite-plus";

import { SEMCONV_KEY } from "#/entities/semconv/index.ts";
import type { ResolvedSemconv, SemconvOptions } from "#/entities/semconv/index.ts";
import { decodeLogs, decodeMetrics, decodeSpans } from "#/entities/telemetry/index.ts";
import type {
  ReceivedLogRecord,
  ReceivedMetric,
  ReceivedSpan,
  ReceiverAddress,
  SignalKey,
} from "#/entities/telemetry/index.ts";

import type { ReceiverNotRunning } from "./store.ts";
import { currentReceiver } from "./store.ts";

const taggedError = Schema.TaggedError;

export class TelemetryNotReceived extends taggedError<
  TelemetryNotReceived,
  { readonly brand: unique symbol }
>()("TelemetryNotReceived", { message: Schema.String }) {}

export type ReadError = ReceiverNotRunning | Schema.SchemaError;

export interface WaitOptions<Item> {
  readonly where?: (item: Item) => boolean;
  readonly count?: number;
  readonly timeout?: Duration.Duration;
  readonly interval?: Duration.Duration;
}

interface Signal<Item> {
  readonly label: string;
  readonly received: Effect.Effect<readonly Item[], ReadError>;
}

const DEFAULT_TIMEOUT_SECONDS = 5;
const DEFAULT_INTERVAL_MILLIS = 20;
const DEFAULT_TIMEOUT = Duration.seconds(DEFAULT_TIMEOUT_SECONDS);
const DEFAULT_INTERVAL = Duration.millis(DEFAULT_INTERVAL_MILLIS);
const ONE = 1;

const DEFAULT_SEMCONV: ResolvedSemconv = {
  registry: "https://github.com/open-telemetry/semantic-conventions.git@v1.45.0[model]",
  weaver: "weaver",
  failOn: "violation",
};

export interface OtlpOptions {
  readonly semconv?: SemconvOptions | true;
}

const semconvConfig = (semconv: SemconvOptions | true): ResolvedSemconv => ({
  ...DEFAULT_SEMCONV,
  ...Option.getOrElse(
    Option.liftPredicate(semconv, (options) => options !== true),
    () => ({}),
  ),
});

export const otlp = (options: OtlpOptions = {}): Plugin => ({
  name: "@r_masseater/vitest-otlp",
  config: () => ({
    test: {
      setupFiles: ["@r_masseater/vitest-otlp/setup"],
      ...Option.match(Option.fromNullishOr(options.semconv), {
        onNone: () => ({}),
        onSome: (semconv) => ({
          globalSetup: ["@r_masseater/vitest-otlp/semconv"],
          provide: { [SEMCONV_KEY]: semconvConfig(semconv) },
        }),
      }),
    },
  }),
});

const signal = <Item>(
  label: string,
  key: SignalKey,
  decode: (normalized: unknown) => Effect.Effect<readonly Item[], Schema.SchemaError>,
): Signal<Item> => ({
  label,
  received: currentReceiver.pipe(
    Effect.flatMap((receiver) => receiver.requests),
    Effect.flatMap((requests) => pipe(requests[key], Array.map(decode), Effect.all)),
    Effect.map(Array.flatten),
  ),
});

const spans = signal<ReceivedSpan>("spans", "traces", decodeSpans);
const logs = signal<ReceivedLogRecord>("log records", "logs", decodeLogs);
const metrics = signal<ReceivedMetric>("metrics", "metrics", decodeMetrics);

const everything = (): boolean => true;

const isNotReceived = Predicate.isTagged("TelemetryNotReceived");

const waitFor =
  <Item>({ label, received }: Signal<Item>) =>
  ({
    where = everything,
    count = ONE,
    timeout = DEFAULT_TIMEOUT,
    interval = DEFAULT_INTERVAL,
  }: WaitOptions<Item> = {}): Effect.Effect<readonly Item[], TelemetryNotReceived | ReadError> => {
    const check = (all: readonly Item[]): Effect.Effect<readonly Item[], TelemetryNotReceived> => {
      const matched = pipe(all, Array.filter(where));
      const notYet = TelemetryNotReceived.make({
        message: `Expected ${count} ${label} within ${Duration.format(timeout)}, received ${matched.length} matching of ${all.length}.`,
      });
      return Effect.succeed(matched).pipe(
        Effect.filterOrFail(
          () => matched.length >= count,
          () => notYet,
        ),
      );
    };
    const schedule = pipe(Schedule.spaced(interval), Schedule.upTo({ duration: timeout }));
    return received.pipe(Effect.flatMap(check), Effect.retry({ while: isNotReceived, schedule }));
  };

export const receiverAddress: Effect.Effect<ReceiverAddress, ReceiverNotRunning> =
  currentReceiver.pipe(Effect.map((receiver) => receiver.address));

export const receivedSpans = spans.received;
export const receivedLogs = logs.received;
export const receivedMetrics = metrics.received;

export const waitForSpans = waitFor(spans);
export const waitForLogs = waitFor(logs);
export const waitForMetrics = waitFor(metrics);

export const clearTelemetry: Effect.Effect<void, ReceiverNotRunning> = currentReceiver.pipe(
  Effect.flatMap((receiver) => receiver.clear),
);

export { ReceiverNotRunning } from "./store.ts";
export type {
  Attributes,
  InstrumentationScope,
  ReceivedLogRecord,
  ReceivedMetric,
  ReceivedSpan,
  ReceiverAddress,
} from "#/entities/telemetry/index.ts";
export type { SemconvLevel, SemconvOptions } from "#/entities/semconv/index.ts";
