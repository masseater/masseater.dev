import { Schema } from "effect";

export const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 30;

const Path = Schema.String.check(Schema.isPattern(/^\//u)).annotate({
  description: "Such as /satsuei-lab/. Omit for the whole site",
});

const DayRange = Schema.isBetween({ minimum: MIN_DAYS, maximum: MAX_DAYS });

const Days = Schema.Int.check(DayRange).annotate({
  description: `Default ${DEFAULT_DAYS}`,
});

export const AnalyticsInput = Schema.Struct({
  path: Schema.optionalKey(Path),
  days: Schema.optionalKey(Days),
});
