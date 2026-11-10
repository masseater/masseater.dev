import {
  Array as Arr,
  Option,
  Order,
  Predicate,
  Record as Rec,
  Schema,
  SchemaGetter,
  String as Str,
  pipe,
} from "effect";

const NANOS_PER_MILLI = 1_000_000n;
const UNKNOWN_START = 0n;
const ROOT_DEPTH = 1;
const INDENT = "  ";

const UnixNano = Schema.Union([Schema.String, Schema.Finite]).pipe(
  Schema.decodeTo(Schema.BigInt, {
    decode: SchemaGetter.transform(BigInt),
    encode: SchemaGetter.transform((value) => value.toString()),
  }),
);

const SpanAnnotations = Schema.Struct({
  service: Schema.optional(Schema.String),
  traceId: Schema.String,
  spanId: Schema.String,
  parentSpanId: Schema.optional(Schema.String),
  spanName: Schema.String,
  startTimeUnixNano: Schema.optional(UnixNano),
  endTimeUnixNano: Schema.optional(UnixNano),
  attributes: Schema.optional(Schema.Unknown),
});

type ReceivedSpan = typeof SpanAnnotations.Type;

const SpanEvent = Schema.Struct({
  source: Schema.Struct({ message: Schema.Literal("otlp.span"), annotations: SpanAnnotations }),
});

const decodeSpanEvent = Schema.decodeUnknownOption(SpanEvent);

const spanOf = (event: unknown): Option.Option<ReceivedSpan> =>
  Option.map(decodeSpanEvent(event), ({ source }) => source.annotations);

const durationOf = ({ startTimeUnixNano, endTimeUnixNano }: ReceivedSpan): string =>
  pipe(
    Option.all([
      Option.fromUndefinedOr(startTimeUnixNano),
      Option.fromUndefinedOr(endTimeUnixNano),
    ]),
    Option.map(([start, end]) => (end - start) / NANOS_PER_MILLI),
    Option.match({ onNone: () => "? ms", onSome: (millis) => `${millis.toString()} ms` }),
  );

const byStart = Order.mapInput(
  Order.BigInt,
  (span: ReceivedSpan) => span.startTimeUnixNano ?? UNKNOWN_START,
);

const isRoot =
  (spans: readonly ReceivedSpan[]) =>
  (span: ReceivedSpan): boolean =>
    !pipe(
      spans,
      Arr.some((other) => other.spanId === span.parentSpanId),
    );

const childrenOf = (
  spans: readonly ReceivedSpan[],
  parent: Option.Option<string>,
): readonly ReceivedSpan[] => {
  const belongs = Option.match(parent, {
    onNone: () => isRoot(spans),
    onSome:
      (id) =>
      (span: ReceivedSpan): boolean =>
        span.parentSpanId === id,
  });
  return pipe(spans, Arr.filter(belongs), Arr.sortBy(byStart));
};

const lines = (
  spans: readonly ReceivedSpan[],
  parent: Option.Option<string>,
  depth: number,
): readonly string[] =>
  Arr.flatMap(childrenOf(spans, parent), (span) => [
    `${Str.repeat(depth)(INDENT)}${span.spanName} (${durationOf(span)})`,
    ...lines(spans, Option.some(span.spanId), depth + ROOT_DEPTH),
  ]);

const renderTrace = ([traceId, members]: readonly [
  string,
  Arr.NonEmptyReadonlyArray<ReceivedSpan>,
]): string =>
  Arr.join(
    [
      `trace ${traceId} ${Arr.headNonEmpty(members).service ?? ""}`,
      ...lines(members, Option.none(), ROOT_DEPTH),
    ],
    "\n",
  );

const render = (spans: readonly ReceivedSpan[]): string =>
  pipe(
    spans,
    Arr.groupBy((span) => span.traceId),
    Rec.toEntries,
    Arr.map(renderTrace),
    Arr.join("\n\n"),
  );

const isSeenIn =
  (spans: readonly ReceivedSpan[]) =>
  (name: string): boolean =>
    pipe(
      spans,
      Arr.some((span) => span.spanName === name),
    );

const RequestUrl = Schema.Struct({ url: Schema.Struct({ full: Schema.String }) });

const decodeRequestUrl = Schema.decodeUnknownOption(RequestUrl);

const MARKER = "workers-traces";
const MARKED = "1";
const ID_RADIX = 36;

const markedAt =
  (sentAt: number) =>
  (url: string): string => {
    const marked = new URL(url);
    marked.searchParams.set(`${MARKER}.${sentAt.toString(ID_RADIX)}`, MARKED);
    return marked.href;
  };

const UNREAD_VALUE = "";

const requestOf = Option.liftThrowable((url: string): string => {
  const { origin, pathname, searchParams } = new URL(url);
  const names = pipe(
    Arr.fromIterable(searchParams.keys()),
    Arr.map((name) => [name, UNREAD_VALUE]),
  );
  return `${origin}${pathname}?${new URLSearchParams(names).toString()}`;
});

const startedBy = (url: string) => {
  const sent = requestOf(url);
  return ({ attributes }: ReceivedSpan): boolean =>
    pipe(
      decodeRequestUrl(attributes),
      Option.flatMap((decoded) => requestOf(decoded.url.full)),
      Option.zipWith(sent, (received, wanted) => received === wanted),
      Option.getOrElse(() => false),
    );
};

const traceOf =
  (url: string) =>
  (spans: readonly ReceivedSpan[]): readonly ReceivedSpan[] => {
    const traceIds = pipe(
      spans,
      Arr.filter(startedBy(url)),
      Arr.map(({ traceId }) => traceId),
    );
    return pipe(
      spans,
      Arr.filter(({ traceId }) => Arr.contains(traceIds, traceId)),
    );
  };

const missingOf =
  (expected: readonly string[]) =>
  (spans: readonly ReceivedSpan[]): readonly string[] => {
    const isMissing = Predicate.not(isSeenIn(spans));
    return pipe(expected, Arr.filter(isMissing));
  };

export { markedAt, missingOf, render, spanOf, traceOf };
export type { ReceivedSpan };
