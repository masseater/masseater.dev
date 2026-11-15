export interface Requests {
  readonly traces: readonly unknown[];
  readonly logs: readonly unknown[];
  readonly metrics: readonly unknown[];
}

export type SignalKey = keyof Requests;
