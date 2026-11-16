import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ActivityDay } from "#/pages/home/model/activity.ts";

import { ActivityDayGroup } from "./activity-day-group.tsx";

export const ActivityDayList = ({
  days,
}: Readonly<{ days: readonly ActivityDay[] }>): ReactNode => (
  <div className="flex flex-col gap-4">
    {pipe(
      days,
      Arr.map((group) => <ActivityDayGroup group={group} key={group.day} />),
    )}
  </div>
);
