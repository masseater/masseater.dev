import { Schema } from "effect";

const Keyword = Schema.optionalKey(Schema.String);

export const RecordsSearch = Schema.Struct({ keyword: Keyword });

export const MemosSearch = Schema.Struct({
  project: Schema.optionalKey(Schema.String),
  keyword: Keyword,
});

export const ConversationSearch = Schema.Struct({ cursor: Schema.optionalKey(Schema.Int) });

const CursorText = Schema.FiniteFromString.check(Schema.isInt());

export const CursorQuery = Schema.Struct({ cursor: Schema.optionalKey(CursorText) });

export type RecordsSearchValue = typeof RecordsSearch.Type;

export type MemosSearchValue = typeof MemosSearch.Type;

export type ConversationSearchValue = typeof ConversationSearch.Type;
