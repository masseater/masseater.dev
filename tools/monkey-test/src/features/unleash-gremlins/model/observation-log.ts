import { Array as Arr, Match, Option, pipe } from "effect";

import type { Observation, Phase } from "./observation.ts";

export type LogItem =
  | Readonly<{ _tag: "phase"; phase: Phase }>
  | Readonly<{ _tag: "event"; source: Observation["source"]; text: string }>;

type Step = readonly [Phase, Option.Option<Observation>];

const stepOf = (phase: Phase, item: LogItem): Step =>
  Match.value(item).pipe(
    Match.tag("phase", (change): Step => [change.phase, Option.none()]),
    Match.tag("event", ({ source, text }): Step => [phase, Option.some({ phase, source, text })]),
    Match.exhaustive,
  );

const STARTING_PHASE = "load" as Phase;

export const observationsOf = (items: readonly LogItem[]): readonly Observation[] =>
  pipe(
    items,
    Arr.mapAccum(STARTING_PHASE, (phase, item) => stepOf(phase, item)),
    ([, steps]) => steps,
    Arr.flatMap((step) => Option.toArray(step)),
  );
