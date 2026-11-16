import { getRouteApi } from "@tanstack/react-router";
import { Struct } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { MoneyLink } from "#/entities/money/index.ts";

const route = getRouteApi("/money");

const TEXT = { detail: "内訳まで", summary: "カテゴリーだけ", label: "区分の切り替え" } as const;

const TAB =
  "text-muted-foreground hover:text-foreground aria-[current=true]:border-foreground aria-[current=true]:text-foreground -mb-px border-b-4 border-transparent pb-2 text-sm font-bold";

const FLOW = ["flow"] as const;

export const FlowTabs = ({ summary }: Readonly<{ summary: boolean }>): ReactNode => {
  const search = route.useSearch();
  const detailed = useMemo(() => Struct.omit(search, FLOW), [search]);
  const summarized = useMemo(() => ({ ...search, flow: "summary" as const }), [search]);
  return (
    <nav aria-label={TEXT.label} className="flex gap-6 border-b">
      <MoneyLink className={TAB} current={!summary} search={detailed}>
        {TEXT.detail}
      </MoneyLink>
      <MoneyLink className={TAB} current={summary} search={summarized}>
        {TEXT.summary}
      </MoneyLink>
    </nav>
  );
};
