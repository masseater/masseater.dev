import { getRouteApi } from "@tanstack/react-router";
import { Option, Predicate, Struct, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { PagerButton } from "./pager-button";

const route = getRouteApi("/money");

const TEXT = { first: "最初のページ", next: "次の 100 件" } as const;

const CURSOR = ["cursor"] as const;

export const TransactionPager = ({
  next,
}: Readonly<{ next: Option.Option<string> }>): ReactNode => {
  const search = route.useSearch();
  const first = useMemo(() => Struct.omit(search, CURSOR), [search]);
  const following = useMemo(
    () =>
      pipe(
        next,
        Option.map((cursor) => ({ ...search, cursor })),
      ),
    [next, search],
  );
  return (
    <div className="flex justify-end gap-2">
      {Predicate.isNotUndefined(search.cursor) && (
        <PagerButton label={TEXT.first} search={Option.some(first)} />
      )}
      <PagerButton label={TEXT.next} search={following} />
    </div>
  );
};
