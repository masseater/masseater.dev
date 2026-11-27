import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";
import { segmentsOf } from "#/shared/lib/segment.ts";
import { Box } from "#/shared/ui/box.tsx";
import { slamIn } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";

const FULL_MARK = 1;

export const Shout = ({
  text,
  at = NOTHING,
  className = "caption-outline text-shout",
}: Readonly<{ text: string; at?: number; className?: string }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <Box
      className={`motion font-jp japanese text-center leading-tight font-black ${className}`}
      vars={slamIn({ frame, at })}
    >
      <RichText mark={FULL_MARK} segments={segmentsOf(text)} tone="color" />
    </Box>
  );
};
