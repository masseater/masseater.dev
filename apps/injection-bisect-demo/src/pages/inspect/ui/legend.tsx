import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Tone } from "#/entities/inspection/index.ts";
import { COPY } from "#/shared/config/index.ts";

import { ANSWER_CLASS, TONE_CLASS } from "./tone.ts";

const ITEMS: readonly (readonly [Tone, string])[] = [
  ["pending", COPY.legendPending],
  ["hit", COPY.legendHit],
  ["miss", COPY.legendMiss],
  ["injection", COPY.regions],
];

export const Legend = (): ReactNode => (
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
