import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { useSchedules } from "#/pages/schedules/api/schedules-query.ts";
import { Section } from "#/shared/ui/index.ts";

import { ScheduleTable } from "./schedule-table.tsx";

const TEXT = { title: "定期タスク", empty: "定期タスクはまだありません" } as const;

export const SchedulesPage = (): ReactNode => {
  const schedules = useSchedules();
  return (
    <Section meta={`${schedules.length} 件`} title={TEXT.title}>
      {Arr.isReadonlyArrayEmpty(schedules) && (
        <p className="text-muted-foreground text-sm">{TEXT.empty}</p>
      )}
      {Arr.isReadonlyArrayNonEmpty(schedules) && <ScheduleTable schedules={schedules} />}
    </Section>
  );
};
