import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { useMemos } from "#/pages/memos/api/memos-query.ts";
import { RowList, Card, CardHeader, SearchField } from "#/shared/ui/index.ts";

import { MemoRow } from "./memo-row";

const route = getRouteApi("/memos/");

const TEXT = { search: "作業メモを探す", list: "作業メモ" } as const;

const ACTION = "/memos";

export const MemoList = (): ReactNode => {
  const { project, keyword = "" } = route.useSearch();
  const kept = useMemo(() => Rec.getSomes({ project: Option.fromUndefinedOr(project) }), [project]);
  return (
    <Card>
      <CardHeader title={TEXT.list}>
        <SearchField action={ACTION} kept={kept} label={TEXT.search} value={keyword} />
      </CardHeader>
      <RowList label={TEXT.list}>
        {pipe(
          useMemos(),
          Arr.map((memo) => <MemoRow key={memo.ref} memo={memo} />),
        )}
      </RowList>
    </Card>
  );
};
