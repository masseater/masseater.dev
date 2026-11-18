import { Array as Arr, Effect, Schema, String as Str, pipe } from "effect";

import { decodeLogs, decodeMetrics, decodeSpans } from "#/entities/telemetry/index.ts";
import type {
  ReceivedLogRecord,
  ReceivedMetric,
  ReceivedSpan,
} from "#/entities/telemetry/index.ts";
import { normalizeOtlpJson } from "#/shared/lib/normalize.ts";

export type {
  ReceivedLogRecord,
  ReceivedMetric,
  ReceivedSpan,
} from "#/entities/telemetry/index.ts";

const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.MutableJson));

const linesOf = (text: string): readonly string[] =>
  pipe(
    text,
    Str.split("\n"),
    Arr.filter((line) => Str.isNonEmpty(Str.trim(line))),
  );

const readWith =
  <Item>(decode: (normalized: unknown) => Effect.Effect<readonly Item[], Schema.SchemaError>) =>
  (text: string): Effect.Effect<readonly Item[], Schema.SchemaError> =>
    Effect.forEach(
      linesOf(text),
      (line) => decodeJson(line).pipe(Effect.map(normalizeOtlpJson), Effect.flatMap(decode)),
      { concurrency: 1 },
    ).pipe(Effect.map(Arr.flatten));

export const spansInFile: (
  text: string,
) => Effect.Effect<readonly ReceivedSpan[], Schema.SchemaError> = readWith(decodeSpans);

export const logsInFile: (
  text: string,
) => Effect.Effect<readonly ReceivedLogRecord[], Schema.SchemaError> = readWith(decodeLogs);

export const metricsInFile: (
  text: string,
) => Effect.Effect<readonly ReceivedMetric[], Schema.SchemaError> = readWith(decodeMetrics);
