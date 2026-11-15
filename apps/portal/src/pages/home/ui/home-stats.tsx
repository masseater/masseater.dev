import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { signedYen, yen } from "#/entities/money";
import { useCredentials, useOverview, useRecords } from "#/pages/home/api/home-query";
import { activitiesOf } from "#/pages/home/model/activity";
import { weekCount } from "#/pages/home/model/week-count";
import { Stat } from "#/shared/ui";

import { SessionStat } from "./session-stat";

const TEXT = {
  balance: "今月の収支",
  records: "今週のライフ記録",
  attention: "要対応の認証情報",
  previous: "前週",
  missing: "未登録・未ログイン",
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
    sessions: NO_ROWS,
    transactions: NO_ROWS,
    decks: NO_ROWS,
    categories: NO_ROWS,
  });
  const records = weekCount({ activities, kind: "record", today });
  const missing = Arr.length(Arr.filter(useCredentials(), (state) => state.status === "missing"));
  return (
    <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label={TEXT.balance}
        note={`収入 ${yen(month.income)} ・ 支出 ${yen(month.expense)}`}
        value={signedYen(month.income - month.expense)}
      />
      <Stat
        label={TEXT.records}
        note={`${TEXT.previous} ${String(records.before)}`}
        unit={UNIT_COUNT}
        value={String(records.now)}
      />
      <SessionStat today={today} />
      <Stat label={TEXT.attention} note={TEXT.missing} unit={UNIT_COUNT} value={String(missing)} />
    </div>
  );
};
