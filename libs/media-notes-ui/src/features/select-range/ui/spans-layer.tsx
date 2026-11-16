import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Span, Tone } from "#/features/select-range/model/range.ts";

import { MARK_LANE } from "./lanes.ts";
import { SpanRect } from "./span-rect.tsx";

const FILL: Readonly<Record<Tone, string>> = {
  plain: "fill-foreground/70",
  warn: "fill-destructive/70",
  faint: "fill-muted-foreground/30",
};

export const SpansLayer = ({
  spans,
  duration,
}: Readonly<{ spans: readonly Span[]; duration: number }>): ReactNode =>
  pipe(
    spans,
    Arr.map((span) => (
      <SpanRect
        key={span.key}
        from={span.from}
        to={span.to}
        duration={duration}
        lane={MARK_LANE}
        className={FILL[span.tone]}
      />
    )),
  );
