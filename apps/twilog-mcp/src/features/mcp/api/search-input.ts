import { TWILOG_ACCOUNTS } from "@masseater.dev/repositories/oauth-targets";
import { Schema } from "effect";

const DATE = /^20\d{6}$/u;

const FIRST_PAGE = 1;

const Account = Schema.Literals(TWILOG_ACCOUNTS);

const Timeline = Schema.Literals(["tweets", "likes", "bookmarks"]);

const Day = Schema.String.check(Schema.isPattern(DATE));

const Page = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_PAGE)).annotate({
  description: "Page number, applied to each account. Each account reports its own maxPage.",
});

const SearchInput = Schema.Struct({
  accounts: Schema.optionalKey(
    Schema.Array(Account).annotate({
      description: "X accounts to search, by handle. Omit to search every linked account.",
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
});

type SearchRequest = typeof SearchInput.Type;

export { SearchInput };
export type { SearchRequest };
