import { Array as Arr, Effect, Random, Schema, String as Str, pipe } from "effect";

const ID_PARTS = 6;
const PART_LIMIT = 0xff_ff_ff;
const HEX_WIDTH = 6;
const TRACE_ID_LENGTH = 32;
const SPAN_ID_LENGTH = 16;
const FROM = 0;
const KIND_INTERNAL = 1;
const STATUS_OK = 1;
const STATUS_ERROR = 2;
const SUCCESS = 0;
const NANOS_PER_MILLI = 1_000_000n;
const HEX = 16;
const COMMAND_SEPARATOR = " ";

/** @internal */
export type Lap = Readonly<{
  name: string;
  command: readonly string[];
  startMillis: number;
  endMillis: number;
  exitCode: number;
}>;

const stringAttribute = (key: string, value: string): unknown => ({
  key,
  value: { stringValue: value },
});

const intAttribute = (key: string, value: number): unknown => ({
  key,
  value: { intValue: String(value) },
});

const statusOf = (exitCode: number): number => {
  if (exitCode === SUCCESS) {
    return STATUS_OK;
  }
  return STATUS_ERROR;
};

const hexOf = (value: number): string => Str.padStart(HEX_WIDTH, "0")(value.toString(HEX));

const randomHex = (length: number): Effect.Effect<string> =>
  Effect.all(Arr.replicate(Random.nextIntBetween(FROM, PART_LIMIT), ID_PARTS), {
    concurrency: 1,
  }).pipe(
    Effect.map((parts) => pipe(parts, Arr.map(hexOf), Arr.join(""), Str.slice(FROM, length))),
  );

const spanOf = (lap: Lap, ids: Readonly<{ traceId: string; spanId: string }>): unknown => ({
  ...ids,
  name: lap.name,
  kind: KIND_INTERNAL,
  startTimeUnixNano: String(BigInt(lap.startMillis) * NANOS_PER_MILLI),
  endTimeUnixNano: String(BigInt(lap.endMillis) * NANOS_PER_MILLI),
  attributes: [
    stringAttribute("process.command_line", Arr.join(lap.command, COMMAND_SEPARATOR)),
    intAttribute("process.exit.code", lap.exitCode),
  ],
  status: { code: statusOf(lap.exitCode) },
});

const documentOf = (span: unknown): unknown => ({
  resourceSpans: [
    {
      resource: { attributes: [stringAttribute("service.name", "lap")] },
      scopeSpans: [{ scope: { name: "lap" }, spans: [span] }],
    },
  ],
});

const encode = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

/** @internal */
export const lapLine = Effect.fn("lap.line")(function* lapLine(lap: Lap) {
  const traceId = yield* randomHex(TRACE_ID_LENGTH);
  const spanId = yield* randomHex(SPAN_ID_LENGTH);
  const text = yield* encode(documentOf(spanOf(lap, { traceId, spanId })));
  return `${text}\n`;
});
