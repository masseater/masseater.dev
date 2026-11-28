import type { ScheduleView } from "@masseater.dev/portal-protocol";
import { Table } from "@masseater.dev/ui/table";
import type { ColumnHeading } from "@masseater.dev/ui/table";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { TableHead } from "#/shared/ui/index.ts";

import { ScheduleRow } from "./schedule-row.tsx";

const LABEL = "定期タスク";

const COLUMNS: readonly ColumnHeading[] = [
  { label: "名前" },
  { label: "いつ", className: "w-36" },
  { label: "次回", className: "w-36" },
  { label: "前回", className: "w-56" },
  { label: "モデル", className: "w-36" },
  { label: "状態", className: "w-16" },
];

export const ScheduleTable = ({
  schedules,
}: Readonly<{ schedules: readonly ScheduleView[] }>): ReactNode => (
  <Table label={LABEL} className="min-w-3xl">
    <TableHead columns={COLUMNS} />
    <tbody>
      {pipe(
        schedules,
        Arr.map((schedule) => <ScheduleRow key={schedule.id} schedule={schedule} />),
      )}
    </tbody>
  </Table>
);
