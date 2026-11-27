import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";
import { FIT, NOTHING } from "#/shared/config/index.ts";
import { plainOf, segmentsOf } from "#/shared/lib/segment.ts";
import { Box } from "#/shared/ui/box.tsx";
import { fitSize, innerWidth } from "#/shared/ui/fit.ts";
import { markProgress, slamIn } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";
import { merge, sizeVars } from "#/shared/ui/vars.ts";

const MARK_DELAY = 4;

export const Headline = ({
  shot,
  text,
  at = NOTHING,
  slot = "heading",
}: Readonly<{
  shot: Shot;
  text: string;
  at?: number;
  slot?: "name" | "title" | "heading";
}>): ReactNode => {
  const frame = useCurrentFrame();
  const { format } = shot;
  const segments = segmentsOf(text);
  const size = fitSize({
    text: plainOf(segments),
    width: innerWidth(format),
    max: FIT[format][slot],
    face: "heavy",
  });
  return (
    <Box
      className="motion fitted font-jp text-ink japanese text-center leading-snug font-black"
      vars={merge([sizeVars(size), slamIn({ frame, at })])}
    >
      <RichText mark={markProgress({ frame, at: at + MARK_DELAY })} segments={segments} />
    </Box>
  );
};
