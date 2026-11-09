import type { ReactNode } from "react";

import { TEXT } from "#/pages/ranking/model/labels";

const NUMBER_CELL = "py-2 pl-2 text-right font-normal";

const RankingHead = ({ youtube }: Readonly<{ youtube: boolean }>): ReactNode => (
  <thead className="text-muted-foreground border-b text-left text-xs">
    <tr>
      <th className="w-12 py-2 pr-2 text-right font-normal">{TEXT.rank}</th>
      <th className="py-2 font-normal">{TEXT.song}</th>
      <th className={NUMBER_CELL}>{TEXT.nico}</th>
      {youtube && <th className={NUMBER_CELL}>{TEXT.youtube}</th>}
      {youtube && <th className={NUMBER_CELL}>{TEXT.gap}</th>}
    </tr>
  </thead>
);

export { RankingHead };
