import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { RECENT_SESSION_LIMIT } from "#/entities/watashi";
import { useSessions } from "#/pages/home/api/home-query";
import { activitiesOf } from "#/pages/home/model/activity";
import { boundedText, exactWeeks } from "#/pages/home/model/bounded-count";
import { weekCount } from "#/pages/home/model/week-count";
import { jstMinute } from "#/shared/model";
import { Stat } from "#/shared/ui";

const TEXT = { label: "今週の会話", previous: "前週", unit: "件" } as const;

const NO_ROWS = [] as const;

export const SessionStat = ({ today }: Readonly<{ today: string }>): ReactNode => {
  const sessions = useSessions();
  const activities = activitiesOf({
    records: NO_ROWS,
    memos: NO_ROWS,
    sessions,
    transactions: NO_ROWS,
    decks: NO_ROWS,
    categories: NO_ROWS,
  });
  const count = weekCount({ activities, kind: "conversation", today });
  const exact = exactWeeks({
    stamps: pipe(
      sessions,
      Arr.map((session) => jstMinute(session.lastAt)),
    ),
    limit: RECENT_SESSION_LIMIT,
    today,
  });
  return (
    <Stat
      label={TEXT.label}
      note={`${TEXT.previous} ${boundedText({ count: count.before, exact: exact.before })}`}
      unit={TEXT.unit}
      value={boundedText({ count: count.now, exact: exact.now })}
    />
  );
};
