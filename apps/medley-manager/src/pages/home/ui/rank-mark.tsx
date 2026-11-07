import { Array, Option } from "effect";
import type { ReactNode } from "react";

import { FIRST_RANK } from "#/pages/home/lib/rank";

const PODIUM: readonly string[] = [
  "bg-comment-yellow text-primary-foreground",
  "bg-comment-cyan text-primary-foreground",
  "bg-comment-orange text-primary-foreground",
];

const markColor = (rank: number): string =>
  Option.getOrElse(Array.get(PODIUM, rank - FIRST_RANK), () => "bg-secondary text-foreground");

const RankMark = ({ rank }: Readonly<{ rank: number }>): ReactNode => (
  <span
    className={`font-display flex size-8 shrink-0 items-center justify-center rounded-full text-sm ${markColor(rank)}`}
  >
    {rank}
  </span>
);

export { RankMark };
