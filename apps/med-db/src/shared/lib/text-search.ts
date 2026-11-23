import { Schema } from "effect";

const MAX_KEYWORD = 100;

export const Keyword = Schema.String.check(Schema.isMaxLength(MAX_KEYWORD));

export const TextSearch = Schema.Struct({ keyword: Schema.optional(Keyword) });

export type TextFilter = typeof TextSearch.Type;
