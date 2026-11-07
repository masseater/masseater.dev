import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import type { Span } from "./parser.ts";

const MERGED = 1;

interface Region extends Span {
  readonly probability: number;
}

const byStart = Order.mapInput(Order.Number, (region: Region) => region.start);

const joinRegions =
  (text: string) =>
  (regions: readonly Region[]): readonly Region[] => {
    const sorted = Arr.sort(regions, byStart);
    const joined: Region[] = [];
    for (const region of sorted) {
      const last = Arr.last(joined);
      if (
        Option.isSome(last) &&
        pipe(text, Str.slice(last.value.end, region.start), Str.trim) === ""
      ) {
        joined.splice(-MERGED, MERGED, {
          start: last.value.start,
          end: region.end,
          probability: Math.max(last.value.probability, region.probability),
        });
      } else {
        joined.push(region);
      }
    }
    return joined;
  };

export { joinRegions };
export type { Region };
