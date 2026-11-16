import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { queryObservabilityTelemetry } from "@distilled.cloud/cloudflare/workers";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Config,
  Console,
  DateTime,
  Effect,
  Layer,
  Option,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { FetchHttpClient } from "effect/http";

const LIMIT = 500;
const MINUTE = 60_000;
const QUERY_STRING = /\?[^"]*"/gu;
const SECRET_PARAMETER = /(?<name>context|token)=[^&" ]*/gu;
const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const redact = (json: string): string =>
  pipe(json, Str.replaceAll(QUERY_STRING, '"'), Str.replaceAll(SECRET_PARAMETER, "$<name>=***"));

const printJson = (value: unknown): Effect.Effect<void, Schema.SchemaError> =>
  encodeJson(value).pipe(Effect.flatMap((json) => Console.log(redact(json))));

const needleOf = (needle: string): { readonly needle?: { readonly value: string } } =>
  pipe(
    Option.liftPredicate(needle, Str.isNonEmpty),
    Option.match({ onNone: () => ({}), onSome: (value) => ({ needle: { value } }) }),
  );

const workerLogs = Effect.gen(function* workerLogs() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const minutes = yield* Config.Number("MINUTES");
  const needle = yield* Config.String("NEEDLE").pipe(Config.withDefault(""));
  const service = yield* Config.String("SERVICE");
  const now = yield* DateTime.now;
  const to = DateTime.toEpochMillis(now);
  const result = yield* queryObservabilityTelemetry({
    accountId,
    queryId: "worker-logs",
    view: "events",
    limit: LIMIT,
    timeframe: { from: to - minutes * MINUTE, to },
    parameters: {
      filters: [
        { key: "$metadata.service", operation: "includes", type: "string", value: service },
      ],
      ...needleOf(needle),
    },
  });
  const events = pipe(
    Option.fromNullishOr(result.events),
    Option.flatMap(({ events: found }) => Option.fromNullishOr(found)),
    Option.getOrElse(() => Arr.empty()),
  );
  yield* Console.log(`count ${String(events.length)}`);
  yield* Effect.forEach(
    events,
    ({ timestamp, metadata, workers, source }) =>
      printJson({
        time: timestamp,
        level: metadata.level,
        service: metadata.service,
        message: metadata.message,
        error: metadata.error,
        workers,
        source,
      }),
    { discard: true },
  );
});

const services = CredentialsFromEnv.pipe(Layer.provideMerge(FetchHttpClient.layer));

runMain("worker-logs")(
  Layer.build(services).pipe(
    Effect.flatMap((context) => Effect.provideContext(workerLogs, context)),
    Effect.scoped,
  ),
);
