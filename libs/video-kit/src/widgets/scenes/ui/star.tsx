import type { ReactNode } from "react";

import { slamIn } from "#/shared/ui/motion.ts";
import { Run } from "#/shared/ui/run.tsx";

const STAR = "★";
const FILLED = "text-highlight";
const EMPTY = "text-paper";

const colorOf = (filled: boolean): string => {
  if (filled) {
    return FILLED;
  }
  return EMPTY;
};

export const Star = ({
  filled,
  at,
  frame,
}: Readonly<{ filled: boolean; at: number; frame: number }>): ReactNode => (
  <Run
    className={`motion star-outline font-impact inline-block leading-none ${colorOf(filled)}`}
    vars={slamIn({ frame, at })}
  >
    {STAR}
  </Run>
);
