import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { TimedLine } from "#/entities/script/index.ts";

import { CaptionLine } from "./caption-line.tsx";

export const Caption = ({ lines }: Readonly<{ lines: readonly TimedLine[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const current = pipe(
    lines,
    Arr.findLast(({ line, from }) => line.caption && frame >= from),
  );
  if (Option.isNone(current)) {
    return <div className="horizontal:min-h-40 min-h-64" />;
  }
  return (
    <div className="horizontal:min-h-40 flex min-h-64 items-center justify-center">
      <CaptionLine frame={frame} timed={current.value} />
    </div>
  );
};
