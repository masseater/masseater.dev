import { Option, Schema, pipe } from "effect";

const Sort = Schema.Literals(["youtube", "nico", "youtube-lead", "nico-lead"]);
const Period = Schema.Literals(["all", "1", "7", "30", "custom"]);
const Kind = Schema.Literals(["original", "all"]);
const DateText = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u));

type SortValue = typeof Sort.Type;
type PeriodValue = typeof Period.Type;
type KindValue = typeof Kind.Type;

interface RankingSearch {
  readonly sort: SortValue;
  readonly period: PeriodValue;
  readonly from: string;
  readonly to: string;
  readonly kind: KindValue;
  readonly query: string;
  readonly page: number;
}

const FIRST_PAGE = 1;
const NO_DATE = "";

const DEFAULT_SEARCH: RankingSearch = {
  sort: "youtube",
  period: "all",
  from: NO_DATE,
  to: NO_DATE,
  kind: "original",
  query: "",
  page: FIRST_PAGE,
};

const field = <Codec extends Schema.Codec<unknown, unknown>>({
  codec,
  value,
  fallback,
}: Readonly<{ codec: Codec; value: unknown; fallback: Codec["Type"] }>): Codec["Type"] =>
  pipe(
    Schema.decodeUnknownOption(codec)(value),
    Option.getOrElse(() => fallback),
  );

const rankingSearch = (search: Readonly<Record<string, unknown>>): RankingSearch => ({
  sort: field({ codec: Sort, value: search["sort"], fallback: DEFAULT_SEARCH.sort }),
  period: field({ codec: Period, value: search["period"], fallback: DEFAULT_SEARCH.period }),
  from: field({ codec: DateText, value: search["from"], fallback: NO_DATE }),
  to: field({ codec: DateText, value: search["to"], fallback: NO_DATE }),
  kind: field({ codec: Kind, value: search["kind"], fallback: DEFAULT_SEARCH.kind }),
  query: field({ codec: Schema.String, value: search["query"], fallback: DEFAULT_SEARCH.query }),
  page: field({
    codec: Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_PAGE)),
    value: search["page"],
    fallback: FIRST_PAGE,
  }),
});

const NICO_SORT: SortValue = "nico";

const usableSearch = ({
  search,
  youtube,
}: Readonly<{ search: RankingSearch; youtube: boolean }>): RankingSearch => {
  if (youtube) {
    return search;
  }
  return { ...search, sort: NICO_SORT };
};

export type { KindValue, PeriodValue, RankingSearch, SortValue };
export { rankingSearch, usableSearch };
