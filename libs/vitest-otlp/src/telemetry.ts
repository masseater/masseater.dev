export interface ReceiverAddress {
  readonly httpEndpoint: string;
  readonly grpcEndpoint: string;
}

export type Attributes = Readonly<Record<string, unknown>>;

export interface InstrumentationScope {
  readonly name: string;
  readonly version?: string;
  readonly attributes?: Attributes;
}

export interface ReceivedSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: string;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly attributes: Attributes;
  readonly events: readonly unknown[];
  readonly links: readonly unknown[];
  readonly status: { readonly code?: string; readonly message?: string };
  readonly resource: Attributes;
  readonly scope: InstrumentationScope;
}

export interface ReceivedLogRecord {
  readonly timeUnixNano?: string;
  readonly observedTimeUnixNano?: string;
  readonly severityNumber?: number | string;
  readonly severityText?: string;
  readonly body?: unknown;
  readonly attributes: Attributes;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly resource: Attributes;
  readonly scope: InstrumentationScope;
}

export interface ReceivedMetric {
  readonly name: string;
  readonly description?: string;
  readonly unit?: string;
  readonly type: string;
  readonly dataPoints: readonly unknown[];
  readonly resource: Attributes;
  readonly scope: InstrumentationScope;
}
