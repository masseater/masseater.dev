import type { DescMessage, JsonValue, Message } from "@bufbuild/protobuf";
import { create, fromBinary, fromJson, toBinary, toJson } from "@bufbuild/protobuf";
import { Effect, Option, Predicate, Schema } from "effect";

import type { SignalKey } from "#/entities/telemetry/index.ts";
import {
  ExportLogsServiceRequestSchema,
  ExportLogsServiceResponseSchema,
  ExportMetricsServiceRequestSchema,
  ExportMetricsServiceResponseSchema,
  ExportTraceServiceRequestSchema,
  ExportTraceServiceResponseSchema,
} from "#/shared/api/index.ts";
import { hexIdsToBase64, normalize } from "#/shared/lib/normalize.ts";

import type { ForwardFailed } from "./forward.ts";

const taggedError = Schema.TaggedError;

export class MalformedExport extends taggedError<
  MalformedExport,
  { readonly brand: unique symbol }
>()("MalformedExport", { message: Schema.String }) {}

export interface Endpoint {
  readonly key: SignalKey;
  readonly httpPath: string;
  readonly grpcPath: string;
  readonly request: DescMessage;
  readonly response: DescMessage;
}

export const ENDPOINTS: readonly Endpoint[] = [
  {
    key: "traces",
    httpPath: "/v1/traces",
    grpcPath: "/opentelemetry.proto.collector.trace.v1.TraceService/Export",
    request: ExportTraceServiceRequestSchema,
    response: ExportTraceServiceResponseSchema,
  },
  {
    key: "metrics",
    httpPath: "/v1/metrics",
    grpcPath: "/opentelemetry.proto.collector.metrics.v1.MetricsService/Export",
    request: ExportMetricsServiceRequestSchema,
    response: ExportMetricsServiceResponseSchema,
  },
  {
    key: "logs",
    httpPath: "/v1/logs",
    grpcPath: "/opentelemetry.proto.collector.logs.v1.LogsService/Export",
    request: ExportLogsServiceRequestSchema,
    response: ExportLogsServiceResponseSchema,
  },
];

const malformed = (cause: unknown): MalformedExport =>
  MalformedExport.make({ message: String(cause) });

const decodeJsonText = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.MutableJson));

const parse = (read: () => Message): Effect.Effect<Message, MalformedExport> =>
  Effect.try({ try: read, catch: malformed });

export const fromProtobuf =
  (endpoint: Endpoint) =>
  (body: Uint8Array): Effect.Effect<Message, MalformedExport> =>
    parse(() => fromBinary(endpoint.request, body));

export const fromOtlpJson =
  (endpoint: Endpoint) =>
  (body: Uint8Array): Effect.Effect<Message, MalformedExport> =>
    decodeJsonText(new TextDecoder().decode(body)).pipe(
      Effect.mapError(malformed),
      Effect.flatMap((json) =>
        parse(() =>
          fromJson(endpoint.request, hexIdsToBase64(json), { ignoreUnknownFields: true }),
        ),
      ),
    );

export const normalized =
  (endpoint: Endpoint) =>
  (message: Message): Effect.Effect<JsonValue, MalformedExport> =>
    Effect.try({ try: () => normalize(toJson(endpoint.request, message)), catch: malformed });

export const encoded =
  (endpoint: Endpoint) =>
  (message: Message): Uint8Array =>
    toBinary(endpoint.request, message);

const gunzip = (body: Uint8Array): Effect.Effect<Uint8Array, MalformedExport> =>
  Effect.tryPromise({
    try: () =>
      new Response(
        new Blob([Uint8Array.from(body)]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).bytes(),
    catch: malformed,
  });

export const gunzipWhen =
  (compressed: boolean) =>
  (body: Uint8Array): Effect.Effect<Uint8Array, MalformedExport> =>
    Option.match(
      Option.liftPredicate(body, () => compressed),
      {
        onSome: gunzip,
        onNone: () => Effect.succeed(body),
      },
    );

export type Store = (
  endpoint: Endpoint,
) => (message: Message) => Effect.Effect<void, MalformedExport | ForwardFailed>;

export const LOOPBACK = "127.0.0.1";

export const originOf = (address: object): string =>
  Option.match(Option.liftPredicate(address, Predicate.hasProperty("port")), {
    onSome: ({ port }) => `http://${LOOPBACK}:${String(port)}`,
    onNone: () => "",
  });

export const emptyResponse = (endpoint: Endpoint): Uint8Array =>
  toBinary(endpoint.response, create(endpoint.response));
