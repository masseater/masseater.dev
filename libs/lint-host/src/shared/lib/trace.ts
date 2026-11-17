import { Array as Arr, Boolean as Bool, Effect, Order } from "effect";
import type { Option } from "effect";

const SAMPLED = "01";
const NOT_SAMPLED = "00";

export interface Positioned {
  readonly path: string;
  readonly line: number;
}

const flagsOf = (sampled: boolean): string =>
  Bool.match(sampled, { onFalse: () => NOT_SAMPLED, onTrue: () => SAMPLED });

export const traceparent: Effect.Effect<Option.Option<string>> = Effect.currentSpan.pipe(
  Effect.map((span) => `00-${span.traceId}-${span.spanId}-${flagsOf(span.sampled)}`),
  Effect.option,
);

const byPosition: Order.Order<Positioned> = Order.combine(
  Order.mapInput(Order.String, (found: Positioned) => found.path),
  Order.mapInput(Order.Number, (found: Positioned) => found.line),
);

export const sortByPosition = <Found extends Positioned>(found: readonly Found[]): Found[] =>
  Arr.sort(found, byPosition);
