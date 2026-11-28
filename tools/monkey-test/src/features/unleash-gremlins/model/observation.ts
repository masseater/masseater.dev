import { Array as Arr, String as Str, pipe } from "effect";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";

export type Surface = "page" | "desktop";

export type Phase = "load" | "monkey";

export type Observation = Readonly<{
  phase: Phase;
  source: "error" | "server-error";
  text: string;
}>;

const RESOURCE_FAILURE = "Failed to load resource";
const SHAPE_LENGTH = 160;

export const isReportable = (observation: Observation): boolean =>
  !Str.startsWith(RESOURCE_FAILURE)(observation.text);

const shape = (text: string): string =>
  pipe(
    text,
    Str.replaceAll(/[?#]\S*/gu, ""),
    Str.replaceAll(/\d+/gu, "0"),
    Str.takeLeft(SHAPE_LENGTH),
  );

const keyOf = (observation: Observation): string =>
  `${observation.source} ${shape(observation.text)}`;

export const findingsOfObservations = (
  input: Readonly<{ surface: Surface; target: string; observations: readonly Observation[] }>,
): readonly Finding[] => {
  const reportable = pipe(input.observations, Arr.filter(isReportable));
  const known = pipe(
    reportable,
    Arr.filter(({ phase }) => phase === "load"),
    Arr.map(keyOf),
  );
  return pipe(
    reportable,
    Arr.filter(({ phase }) => phase === "monkey"),
    Arr.filter((observation) => !Arr.contains(known, keyOf(observation))),
    Arr.dedupeWith((left, right) => keyOf(left) === keyOf(right)),
    Arr.map(({ source, text }) =>
      findingOf({
        kind: `${input.surface}-${source}`,
        target: input.target,
        detail: text,
      }),
    ),
  );
};
