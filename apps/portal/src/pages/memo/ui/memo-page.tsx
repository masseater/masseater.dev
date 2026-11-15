import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useMemoDetail } from "#/pages/memo/api/memo-query.ts";

import { MemoArticle } from "./memo-article";

const MISSING = "見つからない";

export const MemoPage = (): ReactNode => {
  const { memo, revisions } = useMemoDetail();
  return pipe(
    Arr.head(memo),
    Option.match({
      onNone: () => <p className="text-muted-foreground">{MISSING}</p>,
      onSome: (found) => <MemoArticle memo={found} revisions={revisions} />,
    }),
  );
};
