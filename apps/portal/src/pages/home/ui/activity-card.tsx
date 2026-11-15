import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import {
  useDecks,
  useMemos,
  useMonthTransactions,
  useOverview,
  useRecords,
  useSessions,
} from "#/pages/home/api/home-query";
import { activitiesOf, byDay } from "#/pages/home/model/activity";
import { Section } from "#/shared/ui";

import { ActivityDayList } from "./activity-day-list";
import { KindFilter } from "./kind-filter";

const TITLE = "最近の動き";

const EMPTY = "この種類の動きはまだありません";

const SHOWN = 40;

const route = getRouteApi("/");

export const ActivityCard = (): ReactNode => {
  const kind = Option.fromUndefinedOr(route.useSearch().kind);
  const overview = useOverview();
  const days = pipe(
    activitiesOf({
      records: useRecords(),
      memos: useMemos(),
      sessions: useSessions(),
      transactions: useMonthTransactions(overview.period.to),
      categories: overview.settings.categories,
      decks: useDecks(),
    }),
    Arr.filter((activity) => Option.isNone(kind) || Option.contains(kind, activity.kind)),
    Arr.take(SHOWN),
    byDay,
  );
  return (
    <Section meta={`${overview.asOf} 時点`} title={TITLE}>
      <KindFilter current={kind} />
      {Arr.isReadonlyArrayNonEmpty(days) && <ActivityDayList days={days} />}
      {Arr.isReadonlyArrayEmpty(days) && <p className="text-muted-foreground text-sm">{EMPTY}</p>}
    </Section>
  );
};
