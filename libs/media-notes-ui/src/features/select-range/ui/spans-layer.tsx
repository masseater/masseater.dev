import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Span, Tone } from "#/features/select-range/model/range.ts";

import { MARK_LANE, PLAY_LANE } from "./lanes.ts";
import { SpanRect } from "./span-rect.tsx";

type Lane = Readonly<{ y: string; height: string }>;

const GUESS = "fill-none [stroke-dasharray:4_3] stroke-[1.5]";

const LOOK: Readonly<Record<Tone, Readonly<{ lane: Lane; className: string }>>> = {
  plain: { lane: MARK_LANE, className: "fill-foreground/70" },
  warn: { lane: MARK_LANE, className: "fill-destructive/70" },
  faint: { lane: MARK_LANE, className: "fill-muted-foreground/30" },
  guess: { lane: PLAY_LANE, className: `${GUESS} stroke-foreground` },
  "guess-warn": { lane: PLAY_LANE, className: `${GUESS} stroke-destructive` },
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
        lane={LOOK[span.tone].lane}
        className={LOOK[span.tone].className}
      />
    )),
  );
