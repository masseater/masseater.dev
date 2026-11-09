import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Ranked } from "#/pages/ranking/model/ranking";

import { RankingHead } from "./ranking-head";
import { SongRow } from "./song-row";

const FIRST_RANK = 1;

const RankingTable = ({
  entries,
  offset,
  youtube,
}: Readonly<{ entries: readonly Ranked[]; offset: number; youtube: boolean }>): ReactNode => (
  <table className="w-full border-collapse text-sm">
    <RankingHead youtube={youtube} />
    <tbody>
      {pipe(
        entries,
        Arr.map((entry, index) => (
          <SongRow
            key={entry.id}
            entry={entry}
            rank={offset + index + FIRST_RANK}
            youtube={youtube}
          />
        )),
      )}
    </tbody>
  </table>
);

export { RankingTable };
