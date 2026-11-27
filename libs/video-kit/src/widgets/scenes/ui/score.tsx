import type { ReactNode } from "react";

import { Box } from "#/shared/ui/box.tsx";
import { slamIn } from "#/shared/ui/motion.ts";

export const Score = ({
  score,
  max,
  at,
  frame,
}: Readonly<{ score: number; max: number; at: number; frame: number }>): ReactNode => (
  <Box
    className="motion font-impact text-star text-ink horizontal:text-star-h leading-none"
    vars={slamIn({ frame, at })}
  >
    {String(score)}
    <span className="text-label text-muted horizontal:text-label-h">{` / ${String(max)}`}</span>
  </Box>
);
