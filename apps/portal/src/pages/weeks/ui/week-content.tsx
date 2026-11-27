import type { ReactNode } from "react";

import type { WeekValue } from "#/pages/weeks/model/weeks.ts";

import { WeekBody } from "./week-body.tsx";
import { WeekFolded } from "./week-folded.tsx";

export const WeekContent = ({ week }: Readonly<{ week: WeekValue }>): ReactNode => {
  if (week.recent) {
    return <WeekBody headless={false} memos={week.memos} />;
  }
  return <WeekFolded memos={week.memos} />;
};
