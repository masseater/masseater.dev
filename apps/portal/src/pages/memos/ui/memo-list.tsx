import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { useMemos } from "#/pages/memos/api/memos-query";
import { RowList, SearchField } from "#/shared/ui";

import { MemoRow } from "./memo-row";

const route = getRouteApi("/_watashi/memos/");

const TEXT = { search: "作業メモを探す", list: "作業メモ" } as const;

const ACTION = "/memos";

const MemoList = (): ReactNode => {
  const { project, keyword = "" } = route.useSearch();
  const kept = useMemo(() => Rec.getSomes({ project: Option.fromUndefinedOr(project) }), [project]);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SearchField action={ACTION} kept={kept} label={TEXT.search} value={keyword} />
      <RowList label={TEXT.list}>
        {pipe(
          useMemos(),
          Arr.map((memo) => <MemoRow key={memo.ref} memo={memo} />),
        )}
      </RowList>
    </div>
  );
};

export { MemoList };
