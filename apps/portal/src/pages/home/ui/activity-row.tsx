import type { ReactNode } from "react";

import { KIND_LABELS, timeOf } from "#/pages/home/model/activity.ts";
import type { Activity } from "#/pages/home/model/activity.ts";

import { ActivityTitle } from "./activity-title";

const NO_TIME = "—";

export const ActivityRow = ({ activity }: Readonly<{ activity: Activity }>): ReactNode => (
  <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-sm sm:flex-nowrap">
    <span className="text-muted-foreground w-12 shrink-0 tabular-nums">
      {timeOf(activity) || NO_TIME}
    </span>
    <span className="text-muted-foreground w-20 shrink-0 text-xs font-bold">
      {KIND_LABELS[activity.kind]}
    </span>
    <span className="min-w-0 flex-1 truncate">
      <ActivityTitle activity={activity} />
    </span>
    <span className="text-muted-foreground w-full truncate pl-35 text-xs sm:w-auto sm:max-w-48 sm:pl-0">
      {activity.context}
    </span>
  </li>
);
