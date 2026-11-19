import type { ReactNode } from "react";

import { TEXT } from "#/entities/ranking/index.ts";

const NUMBER_CELL = "py-2 pl-2 text-right font-normal";

export const RankingHead = ({ youtube }: Readonly<{ youtube: boolean }>): ReactNode => (
  <thead className="text-muted-foreground border-b text-left text-xs">
    <tr>
      <th scope="col" className="w-12 py-2 pr-2 text-right font-normal">
        {TEXT.rank}
      </th>
      <th scope="col" className="py-2 font-normal">
        {TEXT.song}
      </th>
      <th scope="col" className={NUMBER_CELL}>
        {TEXT.nico}
      </th>
      {youtube && (
        <th scope="col" className={NUMBER_CELL}>
          {TEXT.youtube}
        </th>
      )}
      {youtube && (
        <th scope="col" className={NUMBER_CELL}>
          {TEXT.gap}
        </th>
      )}
    </tr>
  </thead>
);
