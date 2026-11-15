import { Schema } from "effect";

const Keyword = Schema.optionalKey(Schema.String);

const RecordsSearch = Schema.Struct({ keyword: Keyword });

const MemosSearch = Schema.Struct({ project: Schema.optionalKey(Schema.String), keyword: Keyword });

const ConversationSearch = Schema.Struct({ cursor: Schema.optionalKey(Schema.Int) });

const CursorText = Schema.FiniteFromString.check(Schema.isInt());

const CursorQuery = Schema.Struct({ cursor: Schema.optionalKey(CursorText) });

type RecordsSearchValue = typeof RecordsSearch.Type;

type MemosSearchValue = typeof MemosSearch.Type;

type ConversationSearchValue = typeof ConversationSearch.Type;

export { ConversationSearch, CursorQuery, MemosSearch, RecordsSearch };
export type { ConversationSearchValue, MemosSearchValue, RecordsSearchValue };
