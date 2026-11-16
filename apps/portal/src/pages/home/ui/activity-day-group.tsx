import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ActivityDay } from "#/pages/home/model/activity.ts";

import { ActivityRow } from "./activity-row.tsx";

export const ActivityDayGroup = ({ group }: Readonly<{ group: ActivityDay }>): ReactNode => (
  <section className="flex flex-col">
    <h3 className="text-muted-foreground border-b pb-1 text-xs font-bold tabular-nums">
      {group.day}
    </h3>
    <ul aria-label={group.day} className="divide-border divide-y">
      {pipe(
        group.activities,
        Arr.map((activity) => <ActivityRow activity={activity} key={activity.key} />),
      )}
    </ul>
  </section>
);
