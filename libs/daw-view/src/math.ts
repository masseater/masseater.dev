export interface Span {
  readonly low: number;
  readonly high: number;
}

export const clamp =
  ({ low, high }: Span) =>
  (value: number): number =>
    Math.min(high, Math.max(low, value));
