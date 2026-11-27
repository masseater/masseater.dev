import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { TimedLine } from "#/entities/script/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popIn } from "#/shared/ui/motion.ts";
import { keyed } from "#/widgets/scenes/model/keyed.ts";

import { CaptionSegment } from "./caption-segment.tsx";

const CAPTION_START = 0.7;

export const CaptionLine = ({
  timed,
  frame,
}: Readonly<{ timed: TimedLine; frame: number }>): ReactNode => {
  const at = Option.getOrElse(timed.emphasisAt, () => timed.from);
  return (
    <Box
      className="motion telop font-text text-caption text-telop japanese horizontal:text-caption-h text-center leading-snug font-extrabold"
      vars={popIn({ frame, at: timed.from, start: CAPTION_START })}
    >
      {pipe(
        keyed({ values: timed.line.segments, label: ({ text }) => text, reveals: [] }),
        Arr.map(({ key, value }) => (
          <CaptionSegment at={at} frame={frame} key={key} segment={value} />
        )),
      )}
    </Box>
  );
};
