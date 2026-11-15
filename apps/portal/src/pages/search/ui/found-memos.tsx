import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useFoundMemos } from "#/pages/search/api/search-query.ts";
import { RowList, Section } from "#/shared/ui/index.ts";

import { FoundMemoRow } from "./found-memo-row";

const TITLE = "作業メモ";

export const FoundMemos = ({ keyword }: Readonly<{ keyword: string }>): ReactNode => {
  const memos = useFoundMemos(keyword);
  return (
    <Section meta={`${String(Arr.length(memos))} 件`} title={TITLE}>
      <RowList label={TITLE}>
        {pipe(
          memos,
          Arr.map((memo) => <FoundMemoRow key={memo.ref} memo={memo} />),
        )}
      </RowList>
    </Section>
  );
};
