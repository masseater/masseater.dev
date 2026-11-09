import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Ranked } from "#/pages/ranking/model/ranking";

import { RankingHead } from "./ranking-head";
import { SongRow } from "./song-row";

const FIRST_RANK = 1;

const RankingTable = ({
  entries,
  offset,
}: Readonly<{ entries: readonly Ranked[]; offset: number }>): ReactNode => (
  <table className="w-full border-collapse text-sm">
    <RankingHead />
    <tbody>
      {pipe(
        entries,
        Arr.map((entry, index) => (
          <SongRow key={entry.id} entry={entry} rank={offset + index + FIRST_RANK} />
        )),
      )}
    </tbody>
  </table>
);

export { RankingTable };
