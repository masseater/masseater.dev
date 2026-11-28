import type { ScheduleView } from "@masseater.dev/portal-protocol";
import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { minuteOf } from "#/pages/schedules/model/runs.ts";

import { LastRun } from "./last-run.tsx";

const CELL = "border-b px-2 py-2.5 align-top";

const TEXT = { defaultModel: "既定", stopped: "—" } as const;

const ENABLED: Readonly<Record<"true" | "false", string>> = { true: "有効", false: "停止" };

const subline = (text: string): ReactNode => (
  <p className="text-muted-foreground text-xs break-words">{text}</p>
);

export const ScheduleRow = ({ schedule }: Readonly<{ schedule: ScheduleView }>): ReactNode => (
  <tr className="hover:bg-muted data-[on=false]:opacity-60" data-on={schedule.enabled}>
    <td className={CELL}>
      <p className="font-bold">{schedule.name}</p>
      {subline(schedule.description)}
      {pipe(Option.fromNullOr(schedule.project), Option.map(subline), Option.getOrNull)}
    </td>
    <td className={CELL}>
      <p className="font-mono text-sm">{schedule.cron}</p>
      {subline(schedule.timezone)}
    </td>
    <td className={`${CELL} tabular-nums`}>
      {pipe(
        Option.fromNullOr(schedule.nextRun),
        Option.map(minuteOf),
        Option.getOrElse(() => TEXT.stopped),
      )}
    </td>
    <td className={CELL}>
      <LastRun run={schedule.lastRun} />
    </td>
    <td className={`${CELL} font-mono text-xs`}>
      {pipe(
        Option.fromNullOr(schedule.model),
        Option.getOrElse(() => TEXT.defaultModel),
      )}
    </td>
    <td className={CELL}>{ENABLED[`${schedule.enabled}`]}</td>
  </tr>
);
