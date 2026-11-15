import { Option, Record as Rec, String as Str, pipe } from "effect";

import type { MemosSearchValue, RecordsSearchValue } from "#/entities/watashi/model/search";

const RECORD_LIMIT = 200;

const MEMO_LIMIT = 100;

const wanted = (keyword: string | undefined): Option.Option<string> =>
  Option.filter(Option.fromUndefinedOr(keyword), Str.isNonEmpty);

const recordsInput = (search: RecordsSearchValue): Readonly<Record<string, unknown>> => ({
  ...Rec.getSomes({ query: wanted(search.keyword) }),
  limit: RECORD_LIMIT,
});

const memosInput = (search: MemosSearchValue): Readonly<Record<string, unknown>> => ({
  ...pipe(
    { project: Option.fromUndefinedOr(search.project), query: wanted(search.keyword) },
    Rec.getSomes,
  ),
  limit: MEMO_LIMIT,
});

export { memosInput, recordsInput };
