import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popIn } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";

const CAPTION_START = 0.85;
const FULL_MARK = 1;
const SILENT = "";

export const Caption = ({
  shot,
  className = "caption-outline",
}: Readonly<{ shot: Shot; className?: string }>): ReactNode => {
  const frame = useCurrentFrame();
  return pipe(
    shot.lines,
    Arr.findLast(({ from }) => frame >= from),
    Option.match({
      onNone: () => SILENT,
      onSome: (line) => (
        <Box
          className={`motion font-jp japanese text-center leading-snug font-black ${className}`}
          vars={popIn({ frame, at: line.from, start: CAPTION_START })}
        >
          <RichText mark={FULL_MARK} segments={line.segments} tone="color" />
        </Box>
      ),
    }),
  );
};
