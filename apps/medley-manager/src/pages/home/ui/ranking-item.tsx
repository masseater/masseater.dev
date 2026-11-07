import type { ReactNode } from "react";

import { RankMark } from "./rank-mark";

const RankingItem = ({
  rank,
  value,
  children,
}: Readonly<{ rank: number; value: string; children: ReactNode }>): ReactNode => (
  <li className="flex items-center gap-3 py-2">
    <RankMark rank={rank} />
    <span className="min-w-0 flex-1 truncate font-bold">{children}</span>
    <span className="text-muted-foreground shrink-0 text-sm tabular-nums">{value}</span>
  </li>
);

export { RankingItem };
