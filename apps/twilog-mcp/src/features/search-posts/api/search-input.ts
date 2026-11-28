import { TWILOG_ACCOUNTS } from "@masseater.dev/repositories/oauth-targets";
import { DateTime, Option, Schema, String as Str, pipe } from "effect";

const DATE = /^(?<year>20\d{2})(?<month>\d{2})(?<day>\d{2})$/u;

const FIRST_PAGE = 1;

const Account = Schema.Literals(TWILOG_ACCOUNTS);

const Timeline = Schema.Literals(["tweets", "likes", "bookmarks"]);

const isoOf = (text: string): string => pipe(text, Str.replace(DATE, "$<year>-$<month>-$<day>"));

const isCalendarDay = (text: string): boolean =>
  DATE.test(text) &&
  pipe(
    DateTime.make(`${isoOf(text)}T00:00:00Z`),
    Option.exists((time) => DateTime.formatIsoDateUtc(time) === isoOf(text)),
  );

const Day = Schema.String.check(
  Schema.makeFilter((text: string) => isCalendarDay(text) || `"${text}" is not a day in YYYYMMDD`),
);

const ordered = Schema.makeFilter(
  ({ startDate, endDate }: Readonly<{ startDate?: string; endDate?: string }>) =>
    pipe(
      Option.all([Option.fromUndefinedOr(startDate), Option.fromUndefinedOr(endDate)]),
      Option.match({ onNone: () => true, onSome: ([start, end]) => start <= end }),
    ) || "endDate must be the same day as startDate or later",
);

const Page = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_PAGE)).annotate({
  description: "Page number, applied to each account. Each account reports its own maxPage.",
});

export const SearchInput = Schema.Struct({
  accounts: Schema.optionalKey(
    Schema.Array(Account).annotate({
      description:
        "X accounts to search, by handle. Omit to search every linked account. isSelf marks the account's own posts. If a result's status is login, ask the owner to open loginUrl and sign in to Togetter as that account.",
    }),
  ),
  keyword: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Space-separated keywords combined with OR. Spelling variants are not merged, so list each variant.",
    }),
  ),
  timeline: Schema.optionalKey(
    Timeline.annotate({ description: "Which timeline to read. Defaults to tweets." }),
  ),
  page: Schema.optionalKey(Page),
  startDate: Schema.optionalKey(
    Day.annotate({ description: "First day to include, as YYYYMMDD." }),
  ),
  endDate: Schema.optionalKey(Day.annotate({ description: "Last day to include, as YYYYMMDD." })),
  includeRetweets: Schema.optionalKey(
    Schema.Boolean.annotate({ description: "Include retweets. Defaults to false." }),
  ),
}).check(ordered);

export type SearchRequest = typeof SearchInput.Type;
