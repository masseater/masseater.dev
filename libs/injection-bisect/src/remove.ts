import { String as Str, Array as Arr, Order } from "effect";

import type { Span } from "./parser.ts";

const FIRST = 0;

const byStart = Order.mapInput(Order.Number, (span: Span) => span.start);

const removeRegions = ({
  text,
  regions,
}: Readonly<{ text: string; regions: readonly Span[] }>): string => {
  const sorted = Arr.sort(regions, byStart);
  let kept = "";
  let from = FIRST;
  for (const { start, end } of sorted) {
    kept += Str.slice(from, Math.max(from, start))(text);
    from = Math.max(from, end);
  }
  return kept + Str.slice(from)(text);
};

export { removeRegions };
