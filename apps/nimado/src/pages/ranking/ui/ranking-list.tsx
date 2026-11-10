import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Ranked } from "#/pages/ranking/model/ranking";

import { Pager } from "./pager";
import { RankingTable } from "./ranking-table";

const PAGE_SIZE = 100;
const FIRST_PAGE = 1;

const RankingList = ({
  entries,
  page,
  youtube,
}: Readonly<{ entries: readonly Ranked[]; page: number; youtube: boolean }>): ReactNode => {
  const pages = Math.max(FIRST_PAGE, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const offset = (current - FIRST_PAGE) * PAGE_SIZE;
  return (
    <>
      <RankingTable
        entries={pipe(entries, Arr.drop(offset), Arr.take(PAGE_SIZE))}
        offset={offset}
        youtube={youtube}
      />
      <Pager page={current} pages={pages} />
    </>
  );
};

export { RankingList };
