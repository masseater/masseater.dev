import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Segment } from "#/shared/lib/segment.ts";

import { Run } from "./run.tsx";
import { markVars } from "./vars.ts";

export type Tone = "marker" | "color";

const EMPHASIS: Readonly<Record<Tone, string>> = { marker: "marker", color: "emphasis" };

const classOf = (segment: Segment, tone: Tone): string => {
  if (segment.code) {
    return "inline-code";
  }
  if (segment.emphasis) {
    return EMPHASIS[tone];
  }
  return "";
};

export const RichText = ({
  segments,
  mark,
  tone = "marker",
}: Readonly<{ segments: readonly Segment[]; mark: number; tone?: Tone }>): ReactNode =>
  pipe(
    segments,
    Arr.map((segment, position) => ({ segment, key: `${String(position)}:${segment.text}` })),
    Arr.map(({ segment, key }) => (
      <Run className={classOf(segment, tone)} key={key} vars={markVars(mark)}>
        {segment.text}
      </Run>
    )),
  );
