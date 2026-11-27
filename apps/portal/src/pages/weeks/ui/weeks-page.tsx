import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { useWeekMemos } from "#/pages/weeks/api/weeks-query.ts";
import { monthsOf, projectsOf } from "#/pages/weeks/model/weeks.ts";

import { MonthGroup } from "./month-group.tsx";
import { WeeksToolbar } from "./weeks-toolbar.tsx";

const route = getRouteApi("/weeks");

export const WeeksPage = (): ReactNode => {
  const search = route.useSearch();
  const memos = useWeekMemos();
  const months = useMemo(() => monthsOf(search)(memos), [search, memos]);
  const projects = useMemo(() => projectsOf(memos), [memos]);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <WeeksToolbar projects={projects} search={search} />
      {pipe(
        months,
        Arr.map((month) => <MonthGroup key={month.key} month={month} />),
      )}
    </div>
  );
};
