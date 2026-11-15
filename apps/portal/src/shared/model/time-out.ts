import { Schema, String as Str, pipe } from "effect";

const Instant = Schema.Struct({ utc: Schema.String, jst: Schema.String });

const DateOnly = Schema.Struct({ date: Schema.String, precision: Schema.String });

const TimeOut = Schema.Union([Instant, DateOnly]);

type TimeOutValue = typeof TimeOut.Type;

const START = 0;

const MINUTE_END = 16;

const shownTime = (time: TimeOutValue): string => {
  if ("jst" in time) {
    return pipe(time.jst, Str.slice(START, MINUTE_END), Str.replace("T", " "));
  }
  return time.date;
};

const sortKey = (time: TimeOutValue): string => {
  if ("utc" in time) {
    return time.utc;
  }
  return time.date;
};

export { TimeOut, shownTime, sortKey };
export type { TimeOutValue };
