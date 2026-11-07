import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { COPY } from "#/pages/inspect/model/copy";
import type { Tone } from "#/pages/inspect/model/overlay";

import { ANSWER_CLASS, TONE_CLASS } from "./tone";

const ITEMS: readonly (readonly [Tone, string])[] = [
  ["pending", COPY.legendPending],
  ["hit", COPY.legendHit],
  ["miss", COPY.legendMiss],
  ["injection", COPY.regions],
];

const Legend = (): ReactNode => (
  <ul className="text-muted-foreground flex flex-wrap gap-4 text-xs">
    {pipe(
      ITEMS,
      Arr.map(([tone, label]) => (
        <li key={tone} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-5 ${TONE_CLASS[tone]}`} />
          {label}
        </li>
      )),
    )}
    <li className="flex items-center gap-1.5">
      <span className={ANSWER_CLASS}>{COPY.sample}</span>
      {COPY.answer}
    </li>
  </ul>
);

export { Legend };
