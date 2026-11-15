import type { Activity, ActivityKind } from "./activity";
import { countSince } from "./activity";
import { previousWeekStart, weekStart } from "./week";

export type WeekCount = Readonly<{ now: number; before: number }>;

export const weekCount = ({
  activities,
  kind,
  today,
}: Readonly<{ activities: readonly Activity[]; kind: ActivityKind; today: string }>): WeekCount => {
  const now = countSince({ activities, kind, since: weekStart(today) });
  const total = countSince({ activities, kind, since: previousWeekStart(today) });
  return { now, before: total - now };
};
