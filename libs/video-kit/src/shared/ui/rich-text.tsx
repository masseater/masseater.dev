import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { Run } from "./run.tsx";
import type { Segment } from "./segment.ts";
import { markVars } from "./vars.ts";

const classOf = (segment: Segment): string => {
  if (segment.code) {
    return "inline-code";
  }
  if (segment.emphasis) {
    return "marker";
  }
  return "";
};

export const RichText = ({
  segments,
  mark,
}: Readonly<{ segments: readonly Segment[]; mark: number }>): ReactNode =>
  pipe(
    segments,
    Arr.map((segment, position) => ({ segment, key: `${String(position)}:${segment.text}` })),
    Arr.map(({ segment, key }) => (
      <Run className={classOf(segment)} key={key} vars={markVars(mark)}>
        {segment.text}
      </Run>
    )),
  );
