import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { SIGNED_YEN, YEN } from "#/entities/money";
import { useCredentials, useOverview, useRecords, useSessions } from "#/pages/home/api/home-query";
import { activitiesOf, countSince } from "#/pages/home/model/activity";
import type { ActivityKind } from "#/pages/home/model/activity";
import { previousWeekStart, weekStart } from "#/pages/home/model/week";
import { Stat } from "#/shared/ui";

const TEXT = {
  balance: "今月の収支",
  records: "今週のライフ記録",
  sessions: "今週の会話",
  attention: "要対応の認証情報",
  previous: "前週",
  missing: "未登録・未ログイン",
  none: "なし",
} as const;

const NO_ROWS = [] as const;

const ZERO = { income: 0, expense: 0, balance: 0 } as const;

const UNIT_COUNT = "件";

export const HomeStats = (): ReactNode => {
  const overview = useOverview();
  const today = overview.asOf;
  const month = pipe(
    Arr.findFirst(overview.months, (row) => row.month === overview.period.to),
    Option.getOrElse(() => ZERO),
  );
  const activities = activitiesOf({
    records: useRecords(),
    memos: NO_ROWS,
    sessions: useSessions(),
    transactions: NO_ROWS,
    decks: NO_ROWS,
    categories: NO_ROWS,
  });
  const count = (kind: ActivityKind): Readonly<{ now: number; before: number }> => {
    const now = countSince({ activities, kind, since: weekStart(today) });
    const total = countSince({ activities, kind, since: previousWeekStart(today) });
    return { now, before: total - now };
  };
  const records = count("record");
  const sessions = count("conversation");
  const missing = Arr.length(Arr.filter(useCredentials(), (state) => state.status === "missing"));
  return (
    <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label={TEXT.balance}
        note={`収入 ${YEN.format(month.income)} ・ 支出 ${YEN.format(month.expense)}`}
        value={SIGNED_YEN.format(month.income - month.expense)}
      />
      <Stat
        label={TEXT.records}
        note={`${TEXT.previous} ${String(records.before)}`}
        unit={UNIT_COUNT}
        value={String(records.now)}
      />
      <Stat
        label={TEXT.sessions}
        note={`${TEXT.previous} ${String(sessions.before)}`}
        unit={UNIT_COUNT}
        value={String(sessions.now)}
      />
      <Stat label={TEXT.attention} note={TEXT.missing} unit={UNIT_COUNT} value={String(missing)} />
    </div>
  );
};
