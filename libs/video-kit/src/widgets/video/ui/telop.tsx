import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { TimedLine } from "#/entities/cut/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popIn } from "#/shared/ui/motion.ts";

import { TelopSegment } from "./telop-segment.tsx";

const TELOP_START = 0.85;

export const Telop = ({
  lines,
  frame,
}: Readonly<{ lines: readonly TimedLine[]; frame: number }>): ReactNode => {
  const current = pipe(
    lines,
    Arr.findLast(({ from }) => frame >= from),
  );
  return Option.match(current, {
    onNone: () => <div className="horizontal:min-h-40 min-h-64" />,
    onSome: (timed) => (
      <div className="horizontal:min-h-40 flex min-h-64 items-center justify-center">
        <Box
          className="motion telop font-jp text-caption text-telop japanese horizontal:text-caption-h text-center leading-snug font-bold"
          vars={popIn({ frame, at: timed.from, start: TELOP_START })}
        >
          {pipe(
            timed.segments,
            Arr.map((segment, position) => (
              <TelopSegment
                at={Option.getOrElse(timed.emphasisAt, () => timed.from)}
                frame={frame}
                key={`${String(position)}:${segment.text}`}
                segment={segment}
              />
            )),
          )}
        </Box>
      </div>
    ),
  });
};
