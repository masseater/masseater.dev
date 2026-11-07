import { Schema } from "effect";

const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 30;

const Path = Schema.String.check(Schema.isPattern(/^\//u)).annotate({
  description: "日別・参照元・国を絞るパス（例: /satsuei-lab/）。省くとサイト全体",
});

const DayRange = Schema.isBetween({ minimum: MIN_DAYS, maximum: MAX_DAYS });

const Days = Schema.Int.check(DayRange).annotate({
  description: `今からさかのぼる日数。既定は ${DEFAULT_DAYS}`,
});

const AnalyticsInput = Schema.Struct({
  path: Schema.optionalKey(Path),
  days: Schema.optionalKey(Days),
});

export { AnalyticsInput, DEFAULT_DAYS };
