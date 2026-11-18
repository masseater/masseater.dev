import { Array as Arr, DateTime, Option, pipe } from "effect";

import type { Field } from "./field.ts";
import type { Schedule } from "./schedule.ts";

const SEARCH_DAYS = 1830;
const HOURS = 24;
const MINUTES = 60;
const SECONDS = 60;
const DAY_MS = 86_400_000;
const MS = 1000;
const NONE = 0;
const NEXT = 1;
const FIRES = 2;

const has = (field: Field, value: number): boolean => Arr.contains(field.values, value);

const dayMatches = (schedule: Schedule, parts: DateTime.DateTime.PartsWithWeekday): boolean => {
  const day = has(schedule.day, parts.day);
  const weekday = has(schedule.weekday, parts.weekDay);
  if (schedule.day.star || schedule.weekday.star) {
    return day && weekday;
  }
  return day || weekday;
};

const isActive = (schedule: Schedule, days: number): boolean => {
  const parts = DateTime.toPartsUtc(DateTime.makeUnsafe(days * DAY_MS));
  return has(schedule.month, parts.month) && dayMatches(schedule, parts);
};

const firesOn = (schedule: Schedule, days: number): readonly number[] => {
  const fires: number[] = [];
  for (const hour of Arr.range(NONE, HOURS - NEXT)) {
    for (const minute of Arr.range(NONE, MINUTES - NEXT)) {
      if (has(schedule.hour, hour) && has(schedule.minute, minute)) {
        fires.push((days * DAY_MS) / MS + (hour * MINUTES + minute) * SECONDS);
      }
    }
  }
  return fires;
};

export const intervalSeconds = (schedule: Schedule): Option.Option<number> => {
  const fires: number[] = [];
  for (let days = NONE; days < SEARCH_DAYS && fires.length < FIRES; days += NEXT) {
    if (isActive(schedule, days)) {
      fires.push(
        ...pipe(
          firesOn(schedule, days),
          Arr.filter((at) => at !== NONE),
        ),
      );
    }
  }
  return Option.map(
    Option.all([Arr.get(fires, NONE), Arr.get(fires, NEXT)]),
    ([first, second]) => second - first,
  );
};
