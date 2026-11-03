import { Array as Arr, pipe } from "effect";

import type { Heading } from "#/entities/entry";

type NumberedHeading = Heading & Readonly<{ number: string }>;

type Counter = Readonly<{ section: number; subsection: number }>;

const STEP = 1;

const START: Counter = { section: 0, subsection: 0 };

const advance = (counter: Counter, heading: Heading): Counter => {
  if (heading.level === "section") {
    return { section: counter.section + STEP, subsection: START.subsection };
  }
  return { ...counter, subsection: counter.subsection + STEP };
};

const label = (counter: Counter, heading: Heading): string => {
  if (heading.level === "section") {
    return `${counter.section}`;
  }
  return `${counter.section}.${counter.subsection}`;
};

const numberHeading = (counter: Counter, heading: Heading): readonly [Counter, NumberedHeading] => {
  const counted = advance(counter, heading);
  return [counted, { ...heading, number: label(counted, heading) }];
};

const numbered = (headings: readonly Heading[]): readonly NumberedHeading[] =>
  pipe(headings, Arr.mapAccum(START, numberHeading), ([, result]) => result);

export type { NumberedHeading };
export { numbered };
