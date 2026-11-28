import type { ScheduleRun } from "@masseater.dev/portal-protocol";
import { DateTime, Option, pipe } from "effect";

import { jstMinute } from "#/shared/model/index.ts";

export type RunState = "replied" | "taken" | "waiting";

export const RUN_LABELS: Readonly<Record<RunState, string>> = {
  replied: "返信あり",
  taken: "作業中",
  waiting: "取り出されていない",
};

export const stateOf = (run: ScheduleRun): RunState =>
  pipe(
    Option.fromNullOr(run.repliedAt),
    Option.as<RunState>("replied"),
    Option.orElse(() => pipe(Option.fromNullOr(run.takenAt), Option.as<RunState>("taken"))),
    Option.getOrElse((): RunState => "waiting"),
  );

export const minuteOf = (at: number): string =>
  pipe(DateTime.makeUnsafe(at), DateTime.formatIso, jstMinute);
